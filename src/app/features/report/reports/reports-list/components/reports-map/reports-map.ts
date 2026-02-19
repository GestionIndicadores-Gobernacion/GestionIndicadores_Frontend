import {
  Component, Input, OnChanges, SimpleChanges,
  OnDestroy, AfterViewInit, ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import * as L from 'leaflet';

import { ReportModel } from '../../../../../../core/models/report.model';
import { AggregateByComponent } from '../../../../../../core/models/report-aggregate.model';
import { VALLE_CENTROIDS, findCentroid, normalizeMunicipio, MunicipioCentroid } from '../../../../../../core/data/valle-geo.data';

// ─── Tipos locales ────────────────────────────────────────────────────────────

export interface MunicipioSummary {
  name: string;
  centroid: MunicipioCentroid;
  totalReports: number;
  urbana: number;
  rural: number;
  reports: ReportModel[];
  /** Componentes con conteo de reportes en este municipio */
  byComponent: { component_id: number; component_name: string; count: number }[];
  /** Indicadores con sus totales agregados */
  indicators: { id: number; name: string; field_type: string; total: number; unit?: string }[];
}

@Component({
  selector: 'app-reports-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-map.html',
  styleUrl: './reports-map.css',
})
export class ReportsMapComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() reports: ReportModel[] = [];
  @Input() strategyMap: Record<number, string> = {};
  /** Mapa de component_id → component_name (se construye de los propios reportes si no llega) */
  @Input() componentMap: Record<number, string> = {};

  // ─── Estado del mapa ────────────────────────────────────────────────────────
  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  private mapInitialized = false;
  readonly MAP_ID = 'reports-leaflet-map';

  // ─── Filtros ────────────────────────────────────────────────────────────────
  selectedComponentId: number | null = null;
  selectedZone: 'all' | 'Urbana' | 'Rural' = 'all';
  searchQuery = '';

  // ─── Panel lateral ──────────────────────────────────────────────────────────
  selectedMunicipio: MunicipioSummary | null = null;
  activeTab: 'overview' | 'indicators' | 'reports' = 'overview';

  // ─── Datos procesados ───────────────────────────────────────────────────────
  municipioMap: Map<string, MunicipioSummary> = new Map();
  availableComponents: { id: number; name: string }[] = [];

  // ─── Estilos de mapa ─────────────────────────────────────────────────────────
  readonly MAP_STYLES: { id: string; label: string; icon: string; url: string; attribution: string }[] = [
    {
      id: 'light',
      label: 'Claro',
      icon: '☀️',
      url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap © CARTO',
    },
    {
      id: 'dark',
      label: 'Oscuro',
      icon: '🌑',
      url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap © CARTO',
    },
    {
      id: 'satellite',
      label: 'Satélite',
      icon: '🛰️',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
    {
      id: 'topo',
      label: 'Topográfico',
      icon: '⛰️',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri, HERE, Garmin, FAO, NOAA, USGS',
    },
  ];

  selectedStyleId = 'light';
  private tileLayer!: L.TileLayer;
  showStylePicker = false;

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      setTimeout(() => this.initMap(), 100);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reports'] || changes['componentMap']) {
      this.buildComponentList();
      this.buildMunicipioMap();
      if (this.mapInitialized) this.renderMarkers();
    }
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  get filteredReports(): ReportModel[] {
    return this.reports.filter(r => {
      if (this.selectedComponentId && r.component_id !== this.selectedComponentId) return false;
      if (this.selectedZone !== 'all' && this.normalizeZone(r.zone_type) !== this.selectedZone) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        if (!r.intervention_location.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  get filteredMunicipios(): MunicipioSummary[] {
    const filtered = this.filteredReports;
    const byMun = new Map<string, ReportModel[]>();
    for (const r of filtered) {
      const key = normalizeMunicipio(r.intervention_location);
      if (!byMun.has(key)) byMun.set(key, []);
      byMun.get(key)!.push(r);
    }
    return Array.from(byMun.entries())
      .map(([key, reps]) => this.buildSummary(reps[0].intervention_location, reps))
      .filter((s): s is MunicipioSummary => s !== null)
      .sort((a, b) => b.totalReports - a.totalReports);
  }

  get totalFilteredReports(): number {
    return this.filteredReports.length;
  }

  get maxReportsInMunicipio(): number {
    return Math.max(...Array.from(this.municipioMap.values()).map(m => m.totalReports), 1);
  }

  getMunicipioColor(total: number): string {
    const max = this.maxReportsInMunicipio;
    const ratio = total / max;
    if (ratio === 0)   return '#f4f4f5';
    if (ratio < 0.25)  return '#d4f1e9';
    if (ratio < 0.5)   return '#6ee7b7';
    if (ratio < 0.75)  return '#10b981';
    return '#065f46';
  }

  getProgressColor(ratio: number): string {
    if (ratio >= 1)    return 'bg-emerald-500';
    if (ratio >= 0.75) return 'bg-emerald-400';
    if (ratio >= 0.5)  return 'bg-amber-400';
    if (ratio >= 0.25) return 'bg-orange-400';
    return 'bg-red-400';
  }

  // ─── Filtros ────────────────────────────────────────────────────────────────

  onComponentFilter(id: number | null): void {
    this.selectedComponentId = id;
    this.renderMarkers();
  }

  onZoneFilter(zone: 'all' | 'Urbana' | 'Rural'): void {
    this.selectedZone = zone;
    this.renderMarkers();
  }

  onSearch(): void {
    this.renderMarkers();
  }

  clearFilters(): void {
    this.selectedComponentId = null;
    this.selectedZone = 'all';
    this.searchQuery = '';
    this.renderMarkers();
  }

  selectMunicipioFromList(summary: MunicipioSummary): void {
    this.selectedMunicipio = summary;
    this.activeTab = 'overview';
    this.map?.flyTo([summary.centroid.lat, summary.centroid.lng], 11, { duration: 0.8 });
    this.cdr.detectChanges();
  }

  closeSidePanel(): void {
    this.selectedMunicipio = null;
    this.cdr.detectChanges();
  }

  // ─── Construcción de datos ──────────────────────────────────────────────────

  private buildComponentList(): void {
    const map = new Map<number, string>();
    for (const r of this.reports) {
      if (!map.has(r.component_id)) {
        const name = this.componentMap[r.component_id];
        map.set(r.component_id, name ?? `Componente ${r.component_id}`);
      }
    }
    this.availableComponents = Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Normaliza zone_type: el backend puede devolver 'ZoneTypeEnum.RURAL' o 'Rural'.
   */
  normalizeZone(zone: string): 'Urbana' | 'Rural' {
    const lower = (zone ?? '').toLowerCase();
    return lower.includes('urban') ? 'Urbana' : 'Rural';
  }

  /**
   * Extrae el valor legible de un indicator_value.
   * Soporta number, string, y objetos con clave 'value', 'total', etc.
   */
  formatIndicatorValue(value: number | string | Record<string, any> | null): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string') return value;
    const obj = value as Record<string, any>;
    if ('value' in obj) return String(obj['value']);
    if ('total' in obj) return String(obj['total']);
    if ('count' in obj) return String(obj['count']);
    const firstPrimitive = Object.entries(obj).find(
      ([, v]) => typeof v === 'number' || typeof v === 'string'
    );
    if (firstPrimitive) return `${firstPrimitive[0]}: ${firstPrimitive[1]}`;
    return JSON.stringify(obj);
  }

  private buildMunicipioMap(): void {
    this.municipioMap = new Map();
    const grouped = new Map<string, ReportModel[]>();
    for (const r of this.reports) {
      const key = normalizeMunicipio(r.intervention_location);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }
    for (const [, reps] of grouped) {
      const summary = this.buildSummary(reps[0].intervention_location, reps);
      if (summary) this.municipioMap.set(normalizeMunicipio(summary.name), summary);
    }
  }

  private buildSummary(location: string, reps: ReportModel[]): MunicipioSummary | null {
    const centroid = findCentroid(location);
    if (!centroid) return null;

    const urbana = reps.filter(r => this.normalizeZone(r.zone_type) === 'Urbana').length;
    const rural  = reps.filter(r => this.normalizeZone(r.zone_type) === 'Rural').length;

    // Agrupar por componente
    const compCount = new Map<number, number>();
    for (const r of reps) {
      compCount.set(r.component_id, (compCount.get(r.component_id) ?? 0) + 1);
    }
    const byComponent = Array.from(compCount.entries()).map(([id, count]) => ({
      component_id: id,
      component_name: this.componentMap[id] ?? `Componente ${id}`,
      count,
    })).sort((a, b) => b.count - a.count);

    // Agregar indicadores numéricos
    const indMap = new Map<number, { id: number; name: string; field_type: string; total: number }>();
    for (const r of reps) {
      for (const iv of r.indicator_values) {
        if (typeof iv.value === 'number' && iv.indicator) {
          if (!indMap.has(iv.indicator_id)) {
            indMap.set(iv.indicator_id, {
              id: iv.indicator_id,
              name: iv.indicator.name,
              field_type: iv.indicator.field_type,
              total: 0,
            });
          }
          indMap.get(iv.indicator_id)!.total += iv.value;
        }
      }
    }

    return {
      name: centroid.name,
      centroid,
      totalReports: reps.length,
      urbana,
      rural,
      reports: reps.sort((a, b) =>
        new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
      ),
      byComponent,
      indicators: Array.from(indMap.values()),
    };
  }

  getSelectedStyle() {
    return this.MAP_STYLES.find(s => s.id === this.selectedStyleId) ?? this.MAP_STYLES[0];
  }

  selectMapStyle(styleId: string): void {
    this.selectedStyleId = styleId;
    this.showStylePicker = false;
    if (!this.mapInitialized) return;
    const style = this.MAP_STYLES.find(s => s.id === styleId)!;
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    this.tileLayer = L.tileLayer(style.url, {
      attribution: style.attribution,
      maxZoom: 14,
    });
    this.tileLayer.addTo(this.map);
  }

  // ─── Mapa Leaflet ───────────────────────────────────────────────────────────

  private initMap(): void {
    const container = document.getElementById(this.MAP_ID);
    if (!container) return;

    // Bounding box del Valle del Cauca con un pequeño margen
    const valleBounds = L.latLngBounds(
      L.latLng(2.8, -77.5),  // SW
      L.latLng(5.3, -75.5)   // NE
    );

    this.map = L.map(this.MAP_ID, {
      center: [3.8, -76.5],
      zoom: 8,
      minZoom: 8,
      maxZoom: 14,
      zoomControl: true,
      scrollWheelZoom: true,
      maxBounds: valleBounds,
      maxBoundsViscosity: 1.0, // rebote duro — no se puede salir del área
    });

    // Tile layer inicial (claro)
    const initialStyle = this.MAP_STYLES.find(s => s.id === this.selectedStyleId)!;
    this.tileLayer = L.tileLayer(initialStyle.url, {
      attribution: initialStyle.attribution,
      maxZoom: 14,
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.mapInitialized = true;
    this.renderMarkers();
  }

  private renderMarkers(): void {
    if (!this.mapInitialized) return;
    this.markersLayer.clearLayers();

    const filtered = this.filteredReports;
    const grouped = new Map<string, ReportModel[]>();
    for (const r of filtered) {
      const key = normalizeMunicipio(r.intervention_location);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    for (const [key, reps] of grouped) {
      const summary = this.buildSummary(reps[0].intervention_location, reps);
      if (!summary) continue;

      const { lat, lng } = summary.centroid;
      const count = reps.length;
      const color = this.getMunicipioColor(count);

      // Círculo de municipio
      const circle = L.circleMarker([lat, lng], {
        radius: Math.max(10, Math.min(32, 8 + count * 3)),
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });

      circle.bindTooltip(`
        <div style="font-family:system-ui;font-size:12px;font-weight:600;color:#18181b">
          ${summary.name}
        </div>
        <div style="font-size:11px;color:#71717a;margin-top:2px">
          ${count} reporte${count !== 1 ? 's' : ''}
        </div>
      `, { direction: 'top', offset: [0, -8] });

      circle.on('click', () => {
        this.zone.run(() => {
          this.selectedMunicipio = summary;
          this.activeTab = 'overview';
          this.cdr.detectChanges();
        });
      });

      this.markersLayer.addLayer(circle);

      // Label con el número encima
      const label = L.divIcon({
        html: `<span style="
          font-family:system-ui;font-size:11px;font-weight:700;
          color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4);
          display:flex;align-items:center;justify-content:center;
          width:100%;height:100%;
        ">${count}</span>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const labelMarker = L.marker([lat, lng], { icon: label, interactive: false });
      this.markersLayer.addLayer(labelMarker);
    }
  }
}
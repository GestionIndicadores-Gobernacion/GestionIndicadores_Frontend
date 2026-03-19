import { CommonModule } from '@angular/common';
import {
  AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input,
  NgZone, OnChanges, OnDestroy, Output, SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { normalizeMunicipio } from '../../../../../core/data/valle-geo.data';
import { ReportModel } from '../../../../../core/models/report.model';
import { ReportsKpiService } from '../../../../../core/services/reports-kpi.service';
import { buildMunicipioMap, buildMunicipioSummary } from './helpers/reports-map.helpers';

export interface MunicipioSummary {
  name: string;
  centroid: { lat: number; lng: number; name: string };
  totalReports: number;
  urbana: number;
  rural: number;
  reports: ReportModel[];
  byComponent: { component_id: number; component_name: string; count: number }[];
  indicators: { id: number; name: string; field_type: string; total: number }[];
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
  @Input() componentMap: Record<number, string> = {};
  @Input() selectedYear: number = new Date().getFullYear();

  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  private mapInitialized = false;
  readonly MAP_ID = 'reports-leaflet-map';

  searchQuery = '';
  selectedMunicipio: MunicipioSummary | null = null;
  activeTab: 'indicators' | 'overview' | 'reports' = 'indicators';
  municipioMap: Map<string, MunicipioSummary> = new Map();
  selectedKpi = 'asistencias';

  // Agregar EventEmitter para notificar al padre
  @Output() yearChange = new EventEmitter<number>();


  readonly MAP_STYLES = [
    { id: 'light', label: 'Claro', icon: '☀️', url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', attribution: '© OpenStreetMap © CARTO' },
    { id: 'dark', label: 'Oscuro', icon: '🌑', url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', attribution: '© OpenStreetMap © CARTO' },
    { id: 'satellite', label: 'Satélite', icon: '🛰️', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, Maxar, Earthstar Geographics' },
    { id: 'topo', label: 'Topográfico', icon: '⛰️', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, HERE, Garmin, FAO, NOAA, USGS' },
  ];

  get availableYears(): number[] {
    const years = new Set(this.reports.map(r =>
      new Date(r.report_date).getFullYear()
    ));
    return Array.from(years).sort((a, b) => b - a);
  }

  onYearChange(year: number | string): void {
    const y = Number(year); // ← fix string→number
    this.yearChange.emit(y);
  }


  selectedStyleId = 'light';
  private tileLayer!: L.TileLayer;
  showStylePicker = false;

  readonly KPI_OPTIONS = [
    { id: 'asistencias', label: 'Asistencias', color: '#0891b2', bg: '#ECFEFF' },
    { id: 'denuncias', label: 'Denuncias', color: '#dc2626', bg: '#FEF2F2' },
    { id: 'esterilizados', label: 'Esterilizados', color: '#059669', bg: '#ECFDF5' },
    { id: 'refugios', label: 'Refugios', color: '#7c3aed', bg: '#F5F3FF' },
    { id: 'ninos', label: 'Niños sensib.', color: '#db2777', bg: '#FDF2F8' },
    { id: 'emprendedores', label: 'Emprendedores', color: '#65a30d', bg: '#F7FEE7' },
  ];

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private kpiService: ReportsKpiService,
  ) { }

  // ── Lifecycle ─────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => setTimeout(() => this.initMap(), 100));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reports'] || changes['componentMap'] || changes['selectedYear']) {
      this.rebuildMap();
    }
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  // ── Filtro por año ────────────────────────────────────────

  private get filteredReports(): ReportModel[] {
    return this.kpiService.filterByYear(this.reports, this.selectedYear);
  }

  // ── Build municipio map ───────────────────────────────────

  private rebuildMap(): void {
    this.municipioMap = buildMunicipioMap(
      this.filteredReports,
      this.componentMap,
      this.normalizeZone.bind(this),
      this.kpiService,
    );
    if (this.mapInitialized) this.renderMarkers();
  }

  // ── Getters ───────────────────────────────────────────────

  get filteredMunicipios(): MunicipioSummary[] {
    const q = this.searchQuery.toLowerCase();
    const source = q
      ? this.filteredReports.filter(r => r.intervention_location.toLowerCase().includes(q))
      : this.filteredReports;

    const byMun = new Map<string, ReportModel[]>();
    for (const r of source) {
      const key = normalizeMunicipio(r.intervention_location);
      if (!byMun.has(key)) byMun.set(key, []);
      byMun.get(key)!.push(r);
    }

    return Array.from(byMun.values())
      .map(reps => buildMunicipioSummary(
        reps[0].intervention_location,
        reps,
        this.componentMap,
        this.normalizeZone.bind(this),
        this.kpiService,
      ))
      .filter((s): s is MunicipioSummary => s !== null)
      .sort((a, b) => this.getKpiValue(b) - this.getKpiValue(a));
  }

  get totalReports(): number { return this.filteredReports.length; }
  get totalMunicipios(): number { return this.municipioMap.size; }

  // ── KPI ──────────────────────────────────────────────────

  onKpiSelect(kpiId: string): void {
    this.selectedKpi = kpiId;
    this.renderMarkers();
    this.cdr.detectChanges();
  }

  getKpiValue(summary: MunicipioSummary): number {
    const map: Record<string, number> = {
      asistencias: summary.indicators.find(i => i.id === -1)?.total ?? 0,
      denuncias: summary.indicators.find(i => i.id === -2)?.total ?? 0,
      esterilizados: summary.indicators.find(i => i.id === -3)?.total ?? 0,
      refugios: summary.indicators.find(i => i.id === -4)?.total ?? 0,
      ninos: summary.indicators.find(i => i.id === -5)?.total ?? 0,
      emprendedores: summary.indicators.find(i => i.id === -6)?.total ?? 0,
    };
    return map[this.selectedKpi] ?? 0;
  }

  getMaxKpiValue(): number {
    return Math.max(...Array.from(this.municipioMap.values()).map(s => this.getKpiValue(s)), 1);
  }

  getKpiColor(value: number, maxValue: number): string {
    const kpi = this.KPI_OPTIONS.find(k => k.id === this.selectedKpi);
    const base = kpi?.color ?? '#2563eb';
    if (value === 0) return '#CBD5E1';
    const ratio = Math.max(0.18, value / maxValue);
    const alpha = Math.round(ratio * 255).toString(16).padStart(2, '0');
    return base + alpha;
  }

  getActiveKpi() {
    return this.KPI_OPTIONS.find(k => k.id === this.selectedKpi) ?? this.KPI_OPTIONS[0];
  }

  getTotalKpiValue(): number {
    return Array.from(this.municipioMap.values()).reduce((sum, m) => sum + this.getKpiValue(m), 0);
  }

  // ── Utilidades ────────────────────────────────────────────

  normalizeZone(zone: string): 'Urbana' | 'Rural' {
    return (zone ?? '').toLowerCase().includes('urban') ? 'Urbana' : 'Rural';
  }

  onSearch(): void {
    this.renderMarkers();
    this.cdr.detectChanges();
  }

  selectMunicipioFromList(summary: MunicipioSummary): void {
    this.selectedMunicipio = summary;
    this.activeTab = 'indicators';
    this.map?.flyTo([summary.centroid.lat, summary.centroid.lng], 11, { duration: 0.8 });
    this.cdr.detectChanges();
  }

  closeSidePanel(): void {
    this.selectedMunicipio = null;
    this.cdr.detectChanges();
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
    this.tileLayer = L.tileLayer(style.url, { attribution: style.attribution, maxZoom: 14 }).addTo(this.map);
  }

  // ── Mapa ──────────────────────────────────────────────────

  private initMap(): void {
    const container = document.getElementById(this.MAP_ID);
    if (!container) return;
    const bounds = L.latLngBounds(L.latLng(2.8, -77.5), L.latLng(5.3, -75.5));
    this.map = L.map(this.MAP_ID, {
      center: [3.8, -76.5], zoom: 8, minZoom: 7, maxZoom: 14,
      scrollWheelZoom: true, maxBounds: bounds, maxBoundsViscosity: 0.8,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    const style = this.MAP_STYLES.find(s => s.id === this.selectedStyleId)!;
    this.tileLayer = L.tileLayer(style.url, { attribution: style.attribution, maxZoom: 14 }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.mapInitialized = true;
    this.renderMarkers();
  }

  private renderMarkers(): void {
    if (!this.mapInitialized) return;
    this.markersLayer.clearLayers();

    const maxKpi = this.getMaxKpiValue();
    const activeKpi = this.getActiveKpi();

    const grouped = new Map<string, ReportModel[]>();
    for (const r of this.filteredReports) {
      const key = normalizeMunicipio(r.intervention_location);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    for (const [, reps] of grouped) {
      const summary = buildMunicipioSummary(
        reps[0].intervention_location,
        reps,
        this.componentMap,
        this.normalizeZone.bind(this),
        this.kpiService,
      );
      if (!summary) continue;

      const { lat, lng } = summary.centroid;
      const kpiValue = this.getKpiValue(summary);
      const color = this.getKpiColor(kpiValue, maxKpi);
      const ratio = maxKpi > 0 ? kpiValue / maxKpi : 0;
      const radius = kpiValue === 0 ? 7 : Math.max(11, Math.min(36, 10 + ratio * 26));

      const circle = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        color: 'rgba(255,255,255,0.9)',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92,
      });

      const tooltipKpiRow = this.selectedKpi !== 'reportes'
        ? `<div style="display:flex;justify-content:space-between;gap:10px;margin-top:4px;padding-top:4px;border-top:1px solid #f1f5f9">
            <span style="color:#94a3b8;font-size:10px">${activeKpi.label}</span>
            <span style="font-weight:700;color:${activeKpi.color};font-size:11px">${kpiValue.toLocaleString()}</span>
           </div>`
        : '';

      circle.bindTooltip(`
        <div style="font-family:system-ui;min-width:130px">
          <div style="font-size:12px;font-weight:700;color:#0f172a">${summary.name}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:1px">${summary.totalReports} reporte${summary.totalReports !== 1 ? 's' : ''}</div>
          ${tooltipKpiRow}
        </div>
      `, { direction: 'top', offset: [0, -radius - 2], className: 'pyba-tooltip' });

      circle.on('click', () => this.zone.run(() => {
        this.selectedMunicipio = summary;
        this.activeTab = 'indicators';
        this.cdr.detectChanges();
      }));

      this.markersLayer.addLayer(circle);

      if (kpiValue > 0) {
        const labelVal = this.selectedKpi === 'reportes' ? summary.totalReports : kpiValue;
        const displayLabel = labelVal >= 1000 ? (labelVal / 1000).toFixed(1) + 'k' : String(labelVal);
        this.markersLayer.addLayer(L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<span style="font-family:system-ui;font-size:10px;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;width:100%;height:100%;letter-spacing:-0.3px">${displayLabel}</span>`,
            className: '', iconSize: [30, 30], iconAnchor: [15, 15],
          }),
          interactive: false,
        }));
      }
    }
  }
}
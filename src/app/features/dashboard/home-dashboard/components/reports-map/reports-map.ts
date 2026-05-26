// reports-map.ts
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type * as L from 'leaflet';
import { normalizeMunicipio, VALLE_CENTROIDS } from '../../../../../core/data/valle-geo.data';
import { ReportModel } from '../../../../../features/report/models/report.model';
import {
  KpiLocationItem,
  ReportsKpiService,
} from '../../../../../features/report/services/reports-kpi.service';
import { MapDetailComponent } from './components/map-detail/map-detail';
import { MapListComponent } from './components/map-list/map-list';
import { MapToolbarComponent } from './components/map-toolbar/map-toolbar';
import { buildMunicipioMap, buildMunicipioSummary } from './helpers/reports-map.helpers';
import { KPI_OPTIONS, KpiOption, MunicipioSummary } from './reports-map.types';

const VALLE_GEOJSON_URL = encodeURI('assets/geojsons/VALLE_DEL _CAUCA_SIMPLIFICADO.geojson');

/** Mapea el nombre de `MpNombre` del GeoJSON a la clave canónica usada por el resto del sistema. */
function geoNameToMunicipioKey(geoName: string): string {
  const k = normalizeMunicipio(geoName);
  if (k === 'santiago de cali') return 'cali';
  if (k === 'calima') return normalizeMunicipio('Calima (El Darién)');
  return k;
}

@Component({
  selector: 'app-reports-map',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MapToolbarComponent, MapListComponent, MapDetailComponent],
  templateUrl: './reports-map.html',
  styleUrl: './reports-map.css',
})
export class ReportsMapComponent implements AfterViewInit, OnChanges, OnDestroy {

  /** Runtime Leaflet module, loaded lazily via dynamic import. */
  private L: typeof import('leaflet') | null = null;

  @Input() reports: ReportModel[] = [];
  @Input() allReports: ReportModel[] = [];
  @Input() strategyMap: Record<number, string> = {};
  @Input() componentMap: Record<number, string> = {};
  @Input() selectedYear: number = new Date().getFullYear();
  /** Rango activo del filtro de período (preset != year o custom). */
  @Input() dateFrom: string | null = null;
  @Input() dateTo: string | null = null;
  @Output() yearChange = new EventEmitter<number>();

  private map!: L.Map;
  private geoJsonLayer: L.GeoJSON | null = null;
  private labelsLayer!: L.LayerGroup;
  private geoJsonData: GeoJSON.FeatureCollection | null = null;
  private mapInitialized = false;
  /** key normalizada → layer del polígono, para resaltar selección desde afuera. */
  private polygonByKey: Map<string, L.Path> = new Map();
  private selectedLayer: L.Path | null = null;
  readonly MAP_ID = 'reports-leaflet-map';

  searchQuery = '';
  selectedKpi = '';
  selectedMunicipio: MunicipioSummary | null = null;
  municipioMap: Map<string, MunicipioSummary> = new Map();

  readonly KPI_OPTIONS = KPI_OPTIONS;

  private kpiByLocation: Map<string, KpiLocationItem> | undefined;
  private destroyRef = inject(DestroyRef);

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone, private kpiService: ReportsKpiService) { }

  ngAfterViewInit(): void { this.zone.runOutsideAngular(() => setTimeout(() => { void this.initMap(); }, 100)); }
  ngOnChanges(c: SimpleChanges): void {
    if (c['reports'] || c['componentMap'] || c['selectedYear'] || c['dateFrom'] || c['dateTo']) {
      this.fetchLocationKpis();
      this.rebuildMap();
    }
  }
  ngOnDestroy(): void { if (this.map) this.map.remove(); }

  /**
   * Si hay rango activo, los reportes ya vienen filtrados por el padre
   * (`home-dashboard.applyFilter`) — solo aplicamos el rango como guarda
   * adicional. Si no, filtramos por año.
   */
  private get filteredReports(): ReportModel[] {
    if (this.dateFrom && this.dateTo) {
      return this.reports.filter(r => {
        const d = (r.report_date as string).substring(0, 10);
        return d >= this.dateFrom! && d <= this.dateTo!;
      });
    }
    const y = Number(this.selectedYear);
    return this.reports.filter(r => {
      const parts = (r.report_date as string).split('-');
      return parseInt(parts[0], 10) === y;
    });
  }

  private fetchLocationKpis(): void {
    // Fuente canónica: backend /kpis/by-location. Si falla, el helper
    // cae al cálculo local con los mismos números.
    this.kpiService.getByLocation(this.selectedYear, this.dateFrom, this.dateTo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const map = new Map<string, KpiLocationItem>();
          for (const it of res.items) {
            map.set(normalizeMunicipio(it.location), it);
          }
          this.kpiByLocation = map;
          this.rebuildMap();
        },
        error: () => {
          this.kpiByLocation = undefined; // fallback local
          this.rebuildMap();
        }
      });
  }

  private rebuildMap(): void {
    this.municipioMap = buildMunicipioMap(
      this.filteredReports, this.componentMap,
      this.normalizeZone.bind(this),
      this.kpiByLocation,
    );
    if (this.mapInitialized) this.renderGeoJson();
  }

  get availableYears(): number[] {
    // Usar allReports para mostrar todos los años disponibles,
    // independientemente del rango activo
    const source = this.allReports.length ? this.allReports : this.reports;
    return [...new Set(source.map(r => new Date(r.report_date).getFullYear()))]
      .sort((a, b) => b - a);
  }
  
  get filteredMunicipios(): MunicipioSummary[] {
    const q = this.searchQuery.toLowerCase();
    const source = q ? this.filteredReports.filter(r => r.intervention_location.toLowerCase().includes(q)) : this.filteredReports;
    const byMun = new Map<string, ReportModel[]>();
    for (const r of source) {
      const key = normalizeMunicipio(r.intervention_location);
      if (!byMun.has(key)) byMun.set(key, []);
      byMun.get(key)!.push(r);
    }
    return Array.from(byMun.entries())
      .map(([key, reps]) => buildMunicipioSummary(
        reps[0].intervention_location, reps, this.componentMap,
        this.normalizeZone.bind(this),
        this.kpiByLocation?.get(key),
      ))
      .filter((s): s is MunicipioSummary => s !== null)
      .sort((a, b) => this.getKpiValue(b) - this.getKpiValue(a));
  }

  getActiveKpi(): KpiOption | null {
    if (!this.selectedKpi) return null;
    return KPI_OPTIONS.find(k => k.id === this.selectedKpi) ?? null;

  }
  getKpiValue(s: MunicipioSummary): number {
    if (!this.selectedKpi) return s.totalReports;
    const m: Record<string, number> = {
      asistencias: s.indicators.find(i => i.id === -1)?.total ?? 0,
      denuncias: s.indicators.find(i => i.id === -2)?.total ?? 0,
      esterilizados: s.indicators.find(i => i.id === -3)?.total ?? 0,
      refugios: s.indicators.find(i => i.id === -4)?.total ?? 0,
      ninos: s.indicators.find(i => i.id === -5)?.total ?? 0,
      emprendedores: s.indicators.find(i => i.id === -6)?.total ?? 0,
    };
    return m[this.selectedKpi] ?? 0;
  }

  getMaxKpiValue(): number { return Math.max(...Array.from(this.municipioMap.values()).map(s => this.getKpiValue(s)), 1); }

  getKpiColor(value: number, maxValue: number): string {
    const activeKpi = this.getActiveKpi();
    const base = activeKpi ? activeKpi.color : '#2d5fa8';
    if (value === 0) return '#CBD5E1';
    const alpha = Math.round(Math.max(0.18, value / maxValue) * 255).toString(16).padStart(2, '0');
    return base + alpha;
  }

  normalizeZone(z: string): 'Urbana' | 'Rural' { return (z ?? '').toLowerCase().includes('urban') ? 'Urbana' : 'Rural'; }

  onSearch(q: string): void { this.searchQuery = q; this.renderGeoJson(); this.cdr.detectChanges(); }
  onYearChange(y: number): void { this.yearChange.emit(y); }

  onKpiChange(id: string): void {
    this.selectedKpi = id === this.selectedKpi ? '' : id;
    this.renderGeoJson();
    this.cdr.detectChanges();
  }

  selectMunicipio(summary: MunicipioSummary): void {
    this.selectedMunicipio = summary;
    this.highlightSelectedPolygon();
    this.cdr.detectChanges();
  }

  closeSidePanel(): void {
    this.selectedMunicipio = null;
    this.clearSelectionHighlight();
    this.cdr.detectChanges();
  }

  /**
   * Construye un MunicipioSummary "vacío" para municipios sin reportes.
   * Permite que el panel se abra y muestre "Sin reportes registrados" en
   * lugar de no reaccionar al click.
   */
  private buildEmptySummary(geoName: string, layer: L.Polygon): MunicipioSummary {
    const canonicalKey = geoNameToMunicipioKey(geoName);
    const match = VALLE_CENTROIDS.find(c => normalizeMunicipio(c.name) === canonicalKey);
    const displayName = match?.name ?? geoName;
    const center = layer.getBounds().getCenter();
    const centroid = match
      ? { lat: match.lat, lng: match.lng, name: displayName }
      : { lat: center.lat, lng: center.lng, name: displayName };
    return {
      name: displayName,
      centroid,
      totalReports: 0,
      urbana: 0,
      rural: 0,
      reports: [],
      byComponent: [],
      indicators: [],
      reportDetails: [],
      indicatorsByComponent: [],
    };
  }

  private highlightSelectedPolygon(): void {
    this.clearSelectionHighlight();
    if (!this.selectedMunicipio || !this.geoJsonLayer) return;
    const key = normalizeMunicipio(this.selectedMunicipio.name);
    const layer = this.polygonByKey.get(key);
    if (!layer) return;
    this.selectedLayer = layer;
    layer.setStyle({ weight: 3, color: '#1B3A6B', fillOpacity: 1 });
    layer.bringToFront();
  }

  private clearSelectionHighlight(): void {
    if (this.selectedLayer && this.geoJsonLayer) {
      this.geoJsonLayer.resetStyle(this.selectedLayer);
    }
    this.selectedLayer = null;
  }

  private async initMap(): Promise<void> {
    const container = document.getElementById(this.MAP_ID);
    if (!container) return;
    // Carga diferida de Leaflet: el chunk no entra al bundle inicial.
    this.L = await import('leaflet');
    const L = this.L;
    this.map = L.map(this.MAP_ID, {
      center: [3.8, -76.5],
      zoom: 8,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
      attributionControl: false,
    });
    this.labelsLayer = L.layerGroup().addTo(this.map);
    this.mapInitialized = true;
    this.loadGeoJson();
  }

  private loadGeoJson(): void {
    fetch(VALLE_GEOJSON_URL)
      .then(r => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        this.geoJsonData = data;
        this.renderGeoJson();
      })
      .catch(() => { /* silent: si falla el fetch, el mapa queda vacío */ });
  }

  private renderGeoJson(): void {
    if (!this.mapInitialized || !this.geoJsonData || !this.L) return;
    const L = this.L;

    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
      this.geoJsonLayer = null;
    }
    this.labelsLayer.clearLayers();
    this.polygonByKey.clear();
    this.selectedLayer = null;

    const maxKpi = this.getMaxKpiValue();
    const activeKpi = this.getActiveKpi();
    const activeLabel = activeKpi?.label ?? '';
    const activeColor = activeKpi?.color ?? '#2d5fa8';

    this.geoJsonLayer = L.geoJSON(this.geoJsonData, {
      style: (feature) => {
        const name = (feature?.properties as any)?.MpNombre ?? '';
        const summary = this.municipioMap.get(geoNameToMunicipioKey(name));
        const value = summary ? this.getKpiValue(summary) : 0;
        return {
          fillColor: value > 0 ? this.getKpiColor(value, maxKpi) : '#E2E8F0',
          weight: 1,
          color: '#ffffff',
          fillOpacity: 0.9,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = (feature.properties as any)?.MpNombre ?? '';
        const key = geoNameToMunicipioKey(name);
        const summary = this.municipioMap.get(key);
        const value = summary ? this.getKpiValue(summary) : 0;
        const totalReports = summary?.totalReports ?? 0;

        this.polygonByKey.set(key, layer as L.Path);

        const kpiRow = activeKpi
          ? `<div style="display:flex;justify-content:space-between;gap:10px;margin-top:4px;padding-top:4px;border-top:1px solid #f1f5f9">
              <span style="color:#94a3b8;font-size:10px">${activeLabel}</span>
              <span style="font-weight:700;color:${activeColor};font-size:11px">${value.toLocaleString()}</span>
            </div>`
          : '';
        layer.bindTooltip(
          `<div style="font-family:system-ui;min-width:140px">
            <div style="font-size:12px;font-weight:700;color:#0f172a">${name}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:1px">${totalReports} reporte${totalReports !== 1 ? 's' : ''}</div>
            ${kpiRow}
          </div>`,
          { sticky: true, direction: 'top', className: 'pyba-tooltip' },
        );

        layer.on({
          mouseover: (e) => {
            const target = e.target as L.Path;
            if (target === this.selectedLayer) return; // no pisar el estilo seleccionado
            target.setStyle({ weight: 2, color: '#1B3A6B', fillOpacity: 1 });
          },
          mouseout: (e) => {
            const target = e.target as L.Path;
            if (target === this.selectedLayer) return;
            this.geoJsonLayer?.resetStyle(target);
          },
          click: (e) => {
            // Quitar el focus del SVG path para que Chrome no pinte el
            // rectángulo de outline alrededor del bounding box del path.
            const path = (e.target as any)?._path as SVGElement | undefined;
            path?.blur?.();
            (document.activeElement as HTMLElement | null)?.blur?.();
            // Si el municipio no tiene reportes, abrimos igual el panel
            // con un summary vacío para que se muestre "Sin reportes".
            const target = summary ?? this.buildEmptySummary(name, layer as L.Polygon);
            this.zone.run(() => {
              this.selectMunicipio(target);
            });
          },
        });

        if (value > 0 && summary) {
          // Label en el centro del polígono (no del centroide histórico),
          // así nunca queda fuera del municipio.
          const center = (layer as L.Polygon).getBounds().getCenter();
          const label = value >= 1000 ? (value / 1000).toFixed(1) + 'k' : String(value);
          this.labelsLayer.addLayer(L.marker(center, {
            icon: L.divIcon({
              html: `<span style="font-family:system-ui;font-size:10px;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;width:100%;height:100%">${label}</span>`,
              className: '',
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            }),
            interactive: false,
          }));
        }
      },
    }).addTo(this.map);

    // Asegurar que Leaflet conoce el tamaño actual del contenedor antes de
    // calcular el fit (si la página o el panel cambiaron de tamaño, el
    // cache interno podría estar obsoleto y el fit saldría chico).
    this.map.invalidateSize(false);
    // Padding responsive: en mobile el toolbar wrap toma más altura arriba
    // y no hay panel lateral; en desktop reservamos espacio sólo para la
    // toolbar superior.
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    this.map.fitBounds(this.geoJsonLayer.getBounds(), {
      paddingTopLeft: isMobile ? [10, 100] : [20, 60],
      paddingBottomRight: isMobile ? [10, 20] : [20, 20],
    });

    // Si había selección previa, restaurarla post-render.
    if (this.selectedMunicipio) this.highlightSelectedPolygon();
  }
}
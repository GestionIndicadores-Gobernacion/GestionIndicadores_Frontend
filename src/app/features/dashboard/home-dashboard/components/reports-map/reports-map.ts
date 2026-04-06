// reports-map.ts
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';
import { normalizeMunicipio } from '../../../../../core/data/valle-geo.data';
import { ReportModel } from '../../../../../core/models/report.model';
import { ReportsKpiService } from '../../../../../core/services/reports-kpi.service';
import { MapDetailComponent } from './components/map-detail/map-detail';
import { MapListComponent } from './components/map-list/map-list';
import { MapToolbarComponent } from './components/map-toolbar/map-toolbar';
import { buildMunicipioMap, buildMunicipioSummary } from './helpers/reports-map.helpers';
import { KPI_OPTIONS, KpiOption, MAP_STYLES, MunicipioSummary } from './reports-map.types';

@Component({
  selector: 'app-reports-map',
  standalone: true,
  imports: [CommonModule, MapToolbarComponent, MapListComponent, MapDetailComponent],
  templateUrl: './reports-map.html',
  styleUrl: './reports-map.css',
})
export class ReportsMapComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() reports: ReportModel[] = [];
  @Input() strategyMap: Record<number, string> = {};
  @Input() componentMap: Record<number, string> = {};
  @Input() selectedYear: number = new Date().getFullYear();
  @Output() yearChange = new EventEmitter<number>();

  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  private tileLayer!: L.TileLayer;
  private mapInitialized = false;
  readonly MAP_ID = 'reports-leaflet-map';

  searchQuery = '';
  selectedKpi = 'asistencias';
  selectedStyleId = 'light';
  selectedMunicipio: MunicipioSummary | null = null;
  municipioMap: Map<string, MunicipioSummary> = new Map();

  readonly KPI_OPTIONS = KPI_OPTIONS;
  readonly MAP_STYLES = MAP_STYLES;

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone, private kpiService: ReportsKpiService) { }

  ngAfterViewInit(): void { this.zone.runOutsideAngular(() => setTimeout(() => this.initMap(), 100)); }
  ngOnChanges(c: SimpleChanges): void { if (c['reports'] || c['componentMap'] || c['selectedYear']) this.rebuildMap(); }
  ngOnDestroy(): void { if (this.map) this.map.remove(); }

  private get filteredReports(): ReportModel[] { return this.kpiService.filterByYear(this.reports, this.selectedYear); }

  private rebuildMap(): void {
    this.municipioMap = buildMunicipioMap(this.filteredReports, this.componentMap, this.normalizeZone.bind(this), this.kpiService);
    if (this.mapInitialized) this.renderMarkers();
  }

  get availableYears(): number[] {
    return [...new Set(this.reports.map(r => new Date(r.report_date).getFullYear()))].sort((a, b) => b - a);
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
    return Array.from(byMun.values())
      .map(reps => buildMunicipioSummary(reps[0].intervention_location, reps, this.componentMap, this.normalizeZone.bind(this), this.kpiService))
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

  onSearch(q: string): void { this.searchQuery = q; this.renderMarkers(); this.cdr.detectChanges(); }
  onYearChange(y: number): void { this.yearChange.emit(y); }

  onKpiChange(id: string): void {
    this.selectedKpi = id === this.selectedKpi ? '' : id;
    this.renderMarkers();
    this.cdr.detectChanges();
  }
  onStyleChange(styleId: string): void {
    this.selectedStyleId = styleId;
    if (!this.mapInitialized) return;
    const style = MAP_STYLES.find(s => s.id === styleId)!;
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    this.tileLayer = L.tileLayer(style.url, { attribution: style.attribution, maxZoom: 14 }).addTo(this.map);
  }

  selectMunicipio(summary: MunicipioSummary): void {
    this.selectedMunicipio = summary;
    this.cdr.detectChanges();
  }

  closeSidePanel(): void { this.selectedMunicipio = null; this.cdr.detectChanges(); }

  private initMap(): void {
    const container = document.getElementById(this.MAP_ID);
    if (!container) return;
    const bounds = L.latLngBounds(L.latLng(2.8, -77.5), L.latLng(5.3, -75.5));
    this.map = L.map(this.MAP_ID, {
      center: [3.8, -76.5],
      zoom: 8,
      minZoom: 8,
      maxZoom: 8,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0
    });

    const style = MAP_STYLES.find(s => s.id === this.selectedStyleId)!;
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
    const activeLabel = activeKpi ? activeKpi.label : 'Reportes';
    const activeColor = activeKpi ? activeKpi.color : '#2d5fa8';

    const grouped = new Map<string, ReportModel[]>();
    for (const r of this.filteredReports) {
      const key = normalizeMunicipio(r.intervention_location);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }
    for (const [, reps] of grouped) {
      const summary = buildMunicipioSummary(reps[0].intervention_location, reps, this.componentMap, this.normalizeZone.bind(this), this.kpiService);
      if (!summary) continue;
      const { lat, lng } = summary.centroid;
      const kpiValue = this.getKpiValue(summary);
      const color = this.getKpiColor(kpiValue, maxKpi);
      const radius = kpiValue === 0 ? 7 : Math.max(11, Math.min(36, 10 + (kpiValue / maxKpi) * 26));
      const circle = L.circleMarker([lat, lng], { radius, fillColor: color, color: 'rgba(255,255,255,0.9)', weight: 2, opacity: 1, fillOpacity: 0.92 });
      circle.bindTooltip(`<div style="font-family:system-ui;min-width:130px"><div style="font-size:12px;font-weight:700;color:#0f172a">${summary.name}</div><div style="font-size:10px;color:#94a3b8;margin-top:1px">${summary.totalReports} reporte${summary.totalReports !== 1 ? 's' : ''}</div><div style="display:flex;justify-content:space-between;gap:10px;margin-top:4px;padding-top:4px;border-top:1px solid #f1f5f9"><span style="color:#94a3b8;font-size:10px">${activeLabel}</span><span style="font-weight:700;color:${activeColor};font-size:11px">${kpiValue.toLocaleString()}</span></div></div>`,
        { direction: 'top', offset: [0, -radius - 2], className: 'pyba-tooltip' });
      circle.on('click', () => this.zone.run(() => { this.selectedMunicipio = summary; this.cdr.detectChanges(); }));
      this.markersLayer.addLayer(circle);
      if (kpiValue > 0) {
        const label = kpiValue >= 1000 ? (kpiValue / 1000).toFixed(1) + 'k' : String(kpiValue);
        this.markersLayer.addLayer(L.marker([lat, lng], { icon: L.divIcon({ html: `<span style="font-family:system-ui;font-size:10px;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;width:100%;height:100%">${label}</span>`, className: '', iconSize: [30, 30], iconAnchor: [15, 15] }), interactive: false }));
      }
    }
  }
}
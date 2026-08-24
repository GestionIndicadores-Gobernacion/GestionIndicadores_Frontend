import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef, Component, DestroyRef, Input, OnChanges, SimpleChanges, inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  getIndicatorDisplayName, getMetricDisplayName,
} from '../../../../../../core/data/indicator-display-names';
import {
  LocationYearConsolidated, LocationYearIndicator, LocationYearRow,
} from '../../../../../../features/report/models/report-aggregate.model';
import { ReportsService } from '../../../../../../features/report/services/reports.service';

/** Fila ya resuelta para la vista activa (indicador + desglose elegidos). */
export interface ConsolidatedViewRow {
  location: string;
  values: number[];   // alineado con `years`
  total: number;
}

/** Pseudo-indicador: conteo de reportes por municipio. */
const REPORTS_OPTION_ID = 0;

@Component({
  selector: 'app-location-year-consolidated',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './location-year-consolidated.html',
})
export class LocationYearConsolidatedComponent implements OnChanges {

  /** Componente en curso en el explorador. `null` → sección oculta. */
  @Input() componentId: number | null = null;

  /**
   * Indicador seleccionado arriba en el explorador. Solo se usa como
   * *sugerencia* de selección inicial y únicamente si es un indicador
   * real (los virtuales del explorador tienen id negativo y no existen
   * en la matriz consolidada).
   */
  @Input() selectedIndicatorId: number | null = null;

  data: LocationYearConsolidated | null = null;
  loading = false;
  errored = false;

  /** Indicador que se está tabulando (o `REPORTS_OPTION_ID`). */
  viewIndicatorId: number | null = null;

  /** Clave del desglose activo; `''` = total del indicador. */
  breakdownKey = '';

  locationFilter = '';
  showEmptyRows = false;

  private destroyRef = inject(DestroyRef);

  constructor(
    private reportsService: ReportsService,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['componentId']) {
      this.load();
      return;
    }
    // El usuario cambió de variable arriba: seguimos esa selección si
    // el indicador existe en la matriz (los virtuales no existen).
    if (changes['selectedIndicatorId'] && this.data) {
      const suggested = this.suggestedIndicatorId();
      if (suggested !== null && suggested !== this.viewIndicatorId) {
        this.viewIndicatorId = suggested;
        this.breakdownKey = '';
        this.recompute();
        this.cd.detectChanges();
      }
    }
  }

  // ── Carga ───────────────────────────────────────────────────────────
  private load(): void {
    this.data = null;
    this.errored = false;
    this.viewIndicatorId = null;
    this.breakdownKey = '';
    this.locationFilter = '';

    if (this.componentId === null) {
      // Sin `detectChanges()`: esta rama corre de forma sincrona dentro de
      // `ngOnChanges`, o sea ya dentro de un ciclo de deteccion del padre.
      // Forzar otro desde aqui reevalua bindings del contenedor a mitad de
      // ciclo y dispara NG0100.
      this.loading = false;
      this.recompute();
      return;
    }

    this.loading = true;
    this.reportsService.consolidatedByLocationYear(this.componentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.data = data;
          this.loading = false;
          this.viewIndicatorId =
            this.suggestedIndicatorId()
            ?? data.indicators[0]?.indicator_id
            ?? (data.years.length ? REPORTS_OPTION_ID : null);
          this.recompute();
          this.cd.detectChanges();
        },
        error: () => {
          this.data = null;
          this.errored = true;
          this.loading = false;
          this.recompute();
          this.cd.detectChanges();
        },
      });
  }

  reload(): void {
    this.load();
  }

  /** Id del indicador del explorador si existe en la matriz. */
  private suggestedIndicatorId(): number | null {
    const id = this.selectedIndicatorId;
    if (id === null || id <= 0 || !this.data) return null;
    return this.data.indicators.some(i => i.indicator_id === id) ? id : null;
  }

  // ── Derivados de la vista ───────────────────────────────────────────
  /**
   * `years`, `indicatorOptions` y `breakdownOptions` son campos y no
   * getters a propósito: los recorre un `*ngFor` y un getter que
   * construye un array nuevo en cada evaluación impide que la detección
   * de cambios se estabilice (NG0103). Se recalculan en `recompute()`.
   */
  years: number[] = [];
  indicatorOptions: { id: number; name: string }[] = [];
  breakdownOptions: { key: string; label: string }[] = [];

  get hasData(): boolean {
    return !!this.data && this.years.length > 0 && this.data.total_reports > 0;
  }

  get isReportsView(): boolean {
    return this.viewIndicatorId === REPORTS_OPTION_ID;
  }

  get activeIndicator(): LocationYearIndicator | null {
    if (!this.data || this.viewIndicatorId === null || this.isReportsView) return null;
    return this.data.indicators
      .find(i => i.indicator_id === this.viewIndicatorId) ?? null;
  }

  get activeIndicatorName(): string {
    if (this.isReportsView) return 'Reportes registrados';
    const ind = this.activeIndicator;
    return ind ? getIndicatorDisplayName(ind.indicator_id, ind.indicator_name) : '';
  }

  private breakdownLabel(fieldType: string, key: string): string {
    return fieldType === 'categorized_group' ? getMetricDisplayName(key) : key;
  }

  /** Etiqueta de la columna/valor que se está tabulando. */
  get valueLabel(): string {
    if (!this.breakdownKey) return this.activeIndicatorName;
    const ind = this.activeIndicator;
    const label = ind ? this.breakdownLabel(ind.field_type, this.breakdownKey) : this.breakdownKey;
    return `${this.activeIndicatorName} · ${label}`;
  }

  /**
   * Unidad de medida real de la columna, para no confundir "atenciones"
   * con "animales únicos".
   *
   * Un `categorized_group` guarda solo contadores por
   * `especie → sexo → métrica` (ver config de los indicadores 99/125:
   * esterilizados, desparasitados, atención veterinaria, vitaminizados,
   * vacunados). No hay identificador de animal en ninguna parte del
   * modelo, así que el total del indicador es la suma de servicios
   * prestados: un animal esterilizado Y vacunado aporta 2. Contar
   * animales únicos es imposible con este dato, no es un bug a corregir.
   */
  get measurementUnit(): string {
    if (this.isReportsView) return 'Reportes registrados';
    const ind = this.activeIndicator;
    if (!ind) return '';
    if (ind.field_type !== 'categorized_group') return '';
    return this.breakdownKey
      ? 'Animales con este servicio'
      : 'Atenciones / servicios realizados';
  }

  /** Advertencia visible solo cuando el total puede duplicar animales. */
  get measurementWarning(): string {
    const ind = this.activeIndicator;
    if (!ind || ind.field_type !== 'categorized_group' || this.breakdownKey) return '';
    return 'Este total suma todos los servicios (esterilización, desparasitación, '
      + 'atención veterinaria, vitaminización, vacunación). Un animal que recibió '
      + 'dos servicios cuenta dos veces: NO son animales únicos. El sistema no '
      + 'registra la identidad de cada animal, por lo que ese dato no existe. '
      + 'Para un conteo sin duplicados, elige una métrica en "Desglose".';
  }

  /**
   * Filas ya resueltas contra el indicador y el desglose activos. Es la
   * única fuente que consumen la tabla y la impresión, para que lo
   * impreso sea exactamente lo que se ve. Se recalcula en `recompute()`
   * (no es un getter para no rehacer el trabajo en cada ciclo de CD).
   */
  rows: ConsolidatedViewRow[] = [];
  columnTotals: number[] = [];
  grandTotal = 0;

  private recompute(): void {
    this.years = this.data?.years ?? [];

    this.indicatorOptions = this.data
      ? [
          ...this.data.indicators.map(i => ({
            id: i.indicator_id,
            name: getIndicatorDisplayName(i.indicator_id, i.indicator_name),
          })),
          { id: REPORTS_OPTION_ID, name: 'Reportes registrados' },
        ]
      : [];

    const active = this.activeIndicator;
    this.breakdownOptions = active
      ? active.breakdown_keys.map(b => ({
          key: b.key,
          label: this.breakdownLabel(active.field_type, b.key),
        }))
      : [];

    const years = this.years;

    const source: { location: string; get: (year: string) => number; total: number }[] =
      !this.data ? []
        : this.isReportsView
          ? this.data.reports_by_location.map(r => ({
              location: r.location,
              get: (y: string) => r.by_year[y] ?? 0,
              total: r.total,
            }))
          : (this.activeIndicator?.rows ?? []).map(r => ({
              location: r.location,
              get: (y: string) => this.cellValue(r, y),
              total: this.rowTotal(r),
            }));

    const needle = this.locationFilter.trim().toLowerCase();

    this.rows = source
      .filter(r => !needle || r.location.toLowerCase().includes(needle))
      .filter(r => this.showEmptyRows || r.total !== 0)
      .map(r => ({
        location: r.location,
        values: years.map(y => r.get(String(y))),
        total: r.total,
      }));

    this.columnTotals = years.map(
      (_, i) => this.rows.reduce((sum, r) => sum + (r.values[i] ?? 0), 0)
    );
    this.grandTotal = this.rows.reduce((sum, r) => sum + r.total, 0);
  }

  private cellValue(row: LocationYearRow, year: string): number {
    if (!this.breakdownKey) return row.by_year[year] ?? 0;
    return row.breakdown_by_year?.[this.breakdownKey]?.[year] ?? 0;
  }

  private rowTotal(row: LocationYearRow): number {
    if (!this.breakdownKey) return row.total;
    return row.breakdown_total?.[this.breakdownKey] ?? 0;
  }

  get isFiltered(): boolean {
    return this.locationFilter.trim().length > 0;
  }

  // ── Handlers ────────────────────────────────────────────────────────
  onIndicatorChange(value: number | string): void {
    this.viewIndicatorId = Number(value);
    this.breakdownKey = '';
    this.recompute();
    this.cd.detectChanges();
  }

  onBreakdownChange(value: string): void {
    this.breakdownKey = value;
    this.recompute();
    this.cd.detectChanges();
  }

  onLocationFilterChange(value: string): void {
    this.locationFilter = value;
    this.recompute();
    this.cd.detectChanges();
  }

  onShowEmptyRowsChange(value: boolean): void {
    this.showEmptyRows = value;
    this.recompute();
    this.cd.detectChanges();
  }

  formatNumber(value: number): string {
    return (value ?? 0).toLocaleString('es-CO');
  }

  trackByLocation = (_: number, row: ConsolidatedViewRow) => row.location;
  trackByIndicatorOption = (_: number, opt: { id: number }) => opt.id;
  trackByBreakdownOption = (_: number, opt: { key: string }) => opt.key;
  trackByYear = (_: number, year: number) => year;

  // ── Impresión ───────────────────────────────────────────────────────
  /**
   * Imprime en un iframe aislado con su propio CSS en vez de aplicar
   * `@media print` sobre el dashboard: el explorador vive dentro de un
   * layout con sidebar y gráficos canvas que no se pagina bien, y así
   * la salida no depende de Tailwind ni del resto de la página.
   */
  print(): void {
    if (!this.hasData) return;

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) { frame.remove(); return; }

    doc.open();
    doc.write(this.buildPrintDocument());
    doc.close();

    let removed = false;
    const cleanup = () => {
      if (removed) return;
      removed = true;
      frame.remove();
    };

    win.onafterprint = () => setTimeout(cleanup, 300);
    // Red de seguridad: algunos navegadores no disparan `onafterprint`
    // si el usuario cancela el diálogo.
    setTimeout(cleanup, 60_000);

    setTimeout(() => {
      win.focus();
      win.print();
    }, 200);
  }

  private buildPrintDocument(): string {
    const esc = (v: unknown) => String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const years = this.years;
    const rows = this.rows;
    const totals = this.columnTotals;

    const generated = new Date().toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const period = years.length === 1
      ? String(years[0])
      : `${years[0]}–${years[years.length - 1]}`;

    const unit = this.measurementUnit;
    const warning = this.measurementWarning;

    const head = [
      '<th class="loc">Municipio</th>',
      ...years.map(y => `<th class="num">${esc(y)}</th>`),
      '<th class="num total">Consolidado</th>',
    ].join('');

    const body = rows.map(r => [
      `<td class="loc">${esc(r.location)}</td>`,
      ...r.values.map(v => `<td class="num">${esc(this.formatNumber(v))}</td>`),
      `<td class="num total">${esc(this.formatNumber(r.total))}</td>`,
    ].join('')).map(cells => `<tr>${cells}</tr>`).join('');

    const foot = [
      '<td class="loc">Total</td>',
      ...totals.map(v => `<td class="num">${esc(this.formatNumber(v))}</td>`),
      `<td class="num total">${esc(this.formatNumber(this.grandTotal))}</td>`,
    ].join('');

    const notes: string[] = [];
    if (warning) notes.push(warning);
    if (this.isFiltered) {
      notes.push(`Filtrado por municipio: "${esc(this.locationFilter.trim())}"`);
    }
    if (!this.showEmptyRows) {
      notes.push('Se omiten los municipios sin datos en el periodo');
    }

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Consolidado por municipio — ${esc(this.valueLabel)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    color: #12233f;
    font-size: 11px;
  }
  header { border-bottom: 2px solid #1B3A6B; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 15px; margin: 0 0 4px; color: #1B3A6B; letter-spacing: .2px; }
  .sub { font-size: 11px; color: #4A6A9B; margin: 0; }
  .meta { margin-top: 8px; font-size: 10px; color: #6B7B96; display: flex; gap: 18px; flex-wrap: wrap; }
  table { width: 100%; border-collapse: collapse; }
  caption { caption-side: top; text-align: left; font-size: 10px; color: #6B7B96; padding-bottom: 6px; }
  th, td { padding: 5px 8px; border-bottom: 1px solid #D6E0F0; }
  thead th {
    background: #EEF3FB; color: #1B3A6B; font-size: 10px;
    text-transform: uppercase; letter-spacing: .6px;
    border-bottom: 1.5px solid #1B3A6B;
  }
  th.loc, td.loc { text-align: left; }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.total, th.total { font-weight: 700; background: #F7FAFE; }
  tbody tr:nth-child(even) td { background: #FBFCFE; }
  tbody tr:nth-child(even) td.total { background: #F2F7FD; }
  tfoot td {
    font-weight: 700; background: #E7EEF9; color: #1B3A6B;
    border-top: 1.5px solid #1B3A6B; border-bottom: none;
  }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { page-break-inside: avoid; }
  footer { margin-top: 12px; font-size: 9.5px; color: #8A9DC0; }
  ul.notes { margin: 4px 0 0; padding-left: 14px; }
  ul.notes li:first-child { color: #8A5A00; }
</style>
</head>
<body>
  <header>
    <h1>Consolidado por municipio — ${esc(this.valueLabel)}</h1>
    <p class="sub">${esc(this.data?.strategy_name ?? '')} · ${esc(this.data?.component_name ?? '')}</p>
    <div class="meta">
      <span><strong>Periodo:</strong> ${esc(period)}</span>
      ${unit ? `<span><strong>Unidad:</strong> ${esc(unit)}</span>` : ''}
      <span><strong>Municipios:</strong> ${rows.length}</span>
      <span><strong>Consolidado:</strong> ${esc(this.formatNumber(this.grandTotal))}</span>
      <span><strong>Generado:</strong> ${esc(generated)}</span>
    </div>
  </header>

  <table>
    <caption>Valores agrupados por municipio y por año de reporte.${
      unit ? ` Unidad de medida: ${esc(unit.toLowerCase())}.` : ''
    }</caption>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr>${foot}</tr></tfoot>
  </table>

  <footer>
    Sistema de Gestión de Indicadores PYBA — Gobernación del Valle del Cauca.
    ${notes.length ? `<ul class="notes">${notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
  </footer>
</body>
</html>`;
  }
}

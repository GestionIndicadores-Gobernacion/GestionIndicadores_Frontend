import { Injectable } from '@angular/core';
import { ReportModel } from '../models/report.model';
import { DatasetService } from './datasets.service';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';

// ─── Constantes ───────────────────────────────────────────────────────────────
export const COMPONENT_ID_ASISTENCIAS = 2;
export const COMPONENT_ID_JUNTAS = 21;
export const COMPONENT_ID_EMPRENDEDORES = 14;
export const COMPONENT_ID_PROMOTORES = 22;
export const COMPONENT_ID_NINOS = 23;  // ← nuevo
export const COMPONENT_ID_ESTERILIZACION = 8;
export const STRATEGY_ID_ESTERILIZACION = 3;

export const ID_ASISTENCIAS_JUNTAS = 160;
export const ID_DENUNCIAS_REPORTADAS = 137;
export const ID_ANIMALES_ESTERILIZADOS = 99;
export const ID_REFUGIOS = 102;
export const ID_NINOS_CAPACITADOS_PROMOTORES = 163;
export const ID_NINOS_CANTIDAD_IMPACTADA = 114;

const DATASET_ID_PERSONAS_CAPACITADAS = 8;
const ESPACIOS_ACOGIDA = ['albergue/refugio', 'fundacion', 'hogar de paso'];

export interface KpiSnapshot {
  asistenciasTecnicas: number;
  denunciasReportadas: number;
  personasCapacitadas: number;
  ninosSensibilizados: number;
  animalesEsterilizados: number;
  refugiosImpactados: number;
  emprendedoresCofinanciados: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsKpiService {

  // Dataset personas capacitadas (global, no tiene municipio)
  private _datasetYear: number | null = null;
  private _datasetRecords: any[] = [];
  private _datasetLoaded = false;

  // ← Emite cuando el dataset termina de cargar
  private _datasetReady$ = new BehaviorSubject<boolean>(false);
  readonly datasetReady$ = this._datasetReady$.asObservable();

  private _personasCapacitadas$ = new BehaviorSubject<number>(0);
  readonly personasCapacitadas$ = this._personasCapacitadas$.asObservable();

  constructor(private datasetService: DatasetService) {
    this.loadDataset();
  }

  // ─── Dataset ──────────────────────────────────────────────────────────────

  private loadDataset(): void {
    this.datasetService.getById(DATASET_ID_PERSONAS_CAPACITADAS).subscribe({
      next: (dataset) => {
        const match = dataset.name.match(/\b(20\d{2})\b/);
        this._datasetYear = match ? Number(match[1]) : null;

        this.datasetService.getRecordsByDataset(DATASET_ID_PERSONAS_CAPACITADAS).subscribe({
          next: (records) => {
            this._datasetRecords = records;
            this._datasetLoaded = true;
            this._datasetReady$.next(true); // ← BehaviorSubject, nuevo suscriptor lo recibe
          },
          error: () => {
            this._datasetLoaded = true;
            this._datasetReady$.next(true);
          }
        });
      },
      error: () => {
        this._datasetLoaded = true;
        this._datasetReady$.next(true);
      }
    });
  }

  calcularPersonasCapacitadas(selectedYear: number): number {
    if (!this._datasetLoaded || this._datasetYear !== selectedYear) return 0;
    return this._datasetRecords.filter(r =>
      r.data?.['mes'] != null && r.data?.['mes'] !== ''
    ).length;
  }

  // ─── Filtro por año ───────────────────────────────────────────────────────
  filterByYear(reports: ReportModel[], year: number): ReportModel[] {
    const y = Number(year); // ← seguro contra strings
    return reports.filter(r => {
      // Parsear fecha como local, no UTC, para evitar el desfase de zona horaria
      const parts = (r.report_date as string).split('-');
      const reportYear = parseInt(parts[0], 10);
      return reportYear === y;
    });
  }
  // ─── KPIs individuales ────────────────────────────────────────────────────

  asistenciasTecnicas(reports: ReportModel[]): number {
    let total = 0;
    for (const r of reports) {
      if (r.component_id === COMPONENT_ID_ASISTENCIAS) {
        total += 1;
        continue;
      }
      if (r.component_id === COMPONENT_ID_JUNTAS) {
        const iv = r.indicator_values?.find(i => i.indicator_id === ID_ASISTENCIAS_JUNTAS);
        if (iv?.value != null) {
          const n = Number(iv.value);
          if (!isNaN(n)) total += n;
        }
      }
    }
    return total;
  }

  denunciasReportadas(reports: ReportModel[]): number {
    return reports.reduce((sum, r) => {
      const iv = r.indicator_values?.find(i => i.indicator_id === ID_DENUNCIAS_REPORTADAS);
      if (iv?.value == null) return sum;
      const n = Number(iv.value);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }

  animalesEsterilizados(reports: ReportModel[]): number {
    return reports
      .filter(r => r.strategy_id === STRATEGY_ID_ESTERILIZACION && r.component_id === COMPONENT_ID_ESTERILIZACION)
      .reduce((sum, r) => {
        const iv = r.indicator_values?.find(i => i.indicator_id === ID_ANIMALES_ESTERILIZADOS);
        if (!iv?.value || typeof iv.value !== 'object') return sum;
        const data = (iv.value as any)['data'];
        if (!data || typeof data !== 'object') return sum;
        let s = 0;
        for (const especie of Object.values(data as Record<string, any>)) {
          if (!especie || typeof especie !== 'object') continue;
          for (const sexo of Object.values(especie as Record<string, any>)) {
            if (!sexo || typeof sexo !== 'object') continue;
            const val = (sexo as any)['no_de_animales_esterilizados'];
            if (typeof val === 'number' && !isNaN(val)) s += val;
          }
        }
        return sum + s;
      }, 0);
  }

  refugiosImpactados(reports: ReportModel[]): number {
    return reports.filter(r => {
      const iv = r.indicator_values?.find(i => i.indicator_id === ID_REFUGIOS);
      if (!iv?.value) return false;
      const val = typeof iv.value === 'string' ? iv.value.toLowerCase().trim() : '';
      return ESPACIOS_ACOGIDA.includes(val);
    }).length;
  }

  ninosSensibilizados(reports: ReportModel[]): number {
    return reports
      .filter(r => r.component_id === COMPONENT_ID_NINOS)  // ← componente 23
      .reduce((sum, r) => {
        const iv = r.indicator_values?.find(i => i.indicator_id === ID_NINOS_CANTIDAD_IMPACTADA); // ← indicator 114
        if (iv?.value == null) return sum;
        const n = Number(iv.value);
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
  }

  emprendedoresCofinanciados(reports: ReportModel[]): number {
    return reports.filter(r => r.component_id === COMPONENT_ID_EMPRENDEDORES).length;
  }

  // ─── Snapshot completo (útil para las cards) ──────────────────────────────

  getSnapshot(reports: ReportModel[], year: number): KpiSnapshot {
    const filtered = this.filterByYear(reports, year);

    // ── LOGS TEMPORALES ──
    console.log('=== KPI SNAPSHOT ===');
    console.log('Total reports recibidos:', reports.length);
    console.log('Año seleccionado:', year);
    console.log('Reports filtrados por año:', filtered.length);

    console.log('--- Denuncias ---');
    filtered.forEach(r => {
      const iv = r.indicator_values?.find(i => i.indicator_id === 137);
      if (iv) console.log('  reporte', r.id, '→ indicator 137 value:', iv.value, typeof iv.value);
    });

    console.log('--- Niños (component 22, indicator 163) ---');
    const promotores = filtered.filter(r => r.component_id === 22);
    console.log('  Reportes component 22:', promotores.length);
    promotores.forEach(r => {
      const iv = r.indicator_values?.find(i => i.indicator_id === 163);
      console.log('  reporte', r.id, '→ indicator 163:', iv?.value);
    });

    console.log('--- Emprendedores (component 14) ---');
    console.log('  Reportes component 14:', filtered.filter(r => r.component_id === 14).length);

    console.log('--- Personas capacitadas ---');
    console.log('  _datasetLoaded:', this._datasetLoaded);
    console.log('  _datasetYear:', this._datasetYear, '=== selectedYear:', year, '?', this._datasetYear === year);
    console.log('  _datasetRecords.length:', this._datasetRecords.length);
    // ── FIN LOGS ──

    return {
      asistenciasTecnicas: this.asistenciasTecnicas(filtered),
      denunciasReportadas: this.denunciasReportadas(filtered),
      personasCapacitadas: this.calcularPersonasCapacitadas(year),
      ninosSensibilizados: this.ninosSensibilizados(filtered),
      animalesEsterilizados: this.animalesEsterilizados(filtered),
      refugiosImpactados: this.refugiosImpactados(filtered),
      emprendedoresCofinanciados: this.emprendedoresCofinanciados(filtered),
    };
  }
}
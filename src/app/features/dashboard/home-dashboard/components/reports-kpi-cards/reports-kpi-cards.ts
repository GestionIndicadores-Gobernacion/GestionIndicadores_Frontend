import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { ReportModel } from '../../../../../core/models/report.model';
import { DashboardCardComponent } from './dashboard-card/dashboard-card';
import { DatasetService } from '../../../../../core/services/datasets.service';

// ─── IDs de indicadores relevantes ───────────────────────────────────────────
const ID_DENUNCIAS_REPORTADAS = 137;
const ID_NINOS_SENSIBILIZADOS = 114;  // ya no se usa pero déjalo por si acaso
const ID_NINOS_CAPACITADOS_PROMOTORES = 163;  // ← agregar
const ID_ASISTENCIAS_JUNTAS = 160;

// ─── IDs de componentes relevantes ───────────────────────────────────────────
const COMPONENT_ID_ASISTENCIAS = 2;
const COMPONENT_ID_JUNTAS = 21;
const COMPONENT_ID_EMPRENDEDORES = 14;
const COMPONENT_ID_PROMOTORES = 22;

// ─── ID del dataset externo ───────────────────────────────────────────────────
const DATASET_ID_PERSONAS_CAPACITADAS = 8;

@Component({
  selector: 'app-reports-kpi-cards',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent],
  templateUrl: './reports-kpi-cards.html',
  styleUrl: './reports-kpi-cards.css',
})
export class ReportsKpiCardsComponent implements OnInit, OnChanges {

  @Input() reports: ReportModel[] = [];
  @Input() selectedYear: number = new Date().getFullYear();

  private _personasCapacitadasDataset = 0;
  private _datasetYear: number | null = null;
  private _datasetRecords: any[] = [];

  constructor(
    private datasetService: DatasetService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPersonasCapacitadas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedYear'] && !changes['selectedYear'].firstChange) {
      this.calcularPersonasCapacitadas();
    }
  }

  // ─── Dataset personas capacitadas ─────────────────────────────────────────

  private loadPersonasCapacitadas(): void {
    this.datasetService.getById(DATASET_ID_PERSONAS_CAPACITADAS).subscribe({
      next: (dataset) => {
        const match = dataset.name.match(/\b(20\d{2})\b/);
        this._datasetYear = match ? Number(match[1]) : null;

        this.datasetService.getRecordsByDataset(DATASET_ID_PERSONAS_CAPACITADAS).subscribe({
          next: (records) => {
            this._datasetRecords = records;
            this.calcularPersonasCapacitadas();
            this.cdr.markForCheck();
          },
          error: () => {
            this._personasCapacitadasDataset = 0;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this._personasCapacitadasDataset = 0;
        this.cdr.markForCheck();
      }
    });
  }

  private calcularPersonasCapacitadas(): void {
    if (this._datasetYear !== this.selectedYear) {
      this._personasCapacitadasDataset = 0;
      this.cdr.markForCheck();
      return;
    }

    this._personasCapacitadasDataset = this._datasetRecords.filter(r =>
      r.data?.['mes'] !== null &&
      r.data?.['mes'] !== undefined &&
      r.data?.['mes'] !== ''
    ).length;

    this.cdr.markForCheck();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private sumNumeric(indicatorId: number): number {
    let total = 0;
    for (const report of this.filteredReports) {
      const iv = report.indicator_values?.find(i => i.indicator_id === indicatorId);
      if (iv?.value != null) {
        const n = Number(iv.value);
        if (!isNaN(n)) total += n;
      }
    }
    return total;
  }

  private get filteredReports(): ReportModel[] {
    return this.reports.filter(r => {
      const year = new Date(r.report_date).getFullYear();
      return year === this.selectedYear;
    });
  }

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  get asistenciasTecnicas(): number {
    let total = 0;
    for (const report of this.filteredReports) {
      if (report.component_id === COMPONENT_ID_ASISTENCIAS) {
        total += 1;
        continue;
      }
      if (report.component_id === COMPONENT_ID_JUNTAS) {
        const iv = report.indicator_values?.find(i => i.indicator_id === ID_ASISTENCIAS_JUNTAS);
        if (iv?.value != null) {
          const n = Number(iv.value);
          if (!isNaN(n)) total += n;
        }
      }
    }
    return total;
  }

  get denunciasReportadas(): number {
    return this.sumNumeric(ID_DENUNCIAS_REPORTADAS);
  }

  get personasCapacitadas(): number {
    return this._personasCapacitadasDataset;
  }

  get ninosSensibilizados(): number {
    let total = 0;

    for (const report of this.filteredReports) {
      if (report.component_id !== COMPONENT_ID_PROMOTORES) continue;

      const iv = report.indicator_values?.find(i => i.indicator_id === ID_NINOS_CAPACITADOS_PROMOTORES);
      if (!iv?.value || typeof iv.value !== 'object') continue;

      const val = iv.value as Record<string, any>;
      for (const v of Object.values(val)) {
        const n = Number(v);
        if (!isNaN(n)) total += n;
      }
    }

    return total;
  }
  
  get animalesEsterilizados(): number {
    const relevant = this.filteredReports.filter(
      r => r.strategy_id === 3 && r.component_id === 8  // ← solo comp 8
    );

    let total = 0;

    for (const report of relevant) {
      const iv = report.indicator_values?.find(i => i.indicator_id === 99);
      if (!iv?.value || typeof iv.value !== 'object') continue;

      const raw = iv.value as Record<string, any>;
      const data = raw['data'];
      if (!data || typeof data !== 'object') continue;

      // data -> especie (CANINO/FELINO) -> sexo (Hembra/Macho) -> no_de_animales_esterilizados
      for (const especie of Object.values(data)) {
        if (!especie || typeof especie !== 'object') continue;
        for (const sexo of Object.values(especie as Record<string, any>)) {
          if (!sexo || typeof sexo !== 'object') continue;
          const val = (sexo as Record<string, any>)['no_de_animales_esterilizados'];
          if (typeof val === 'number' && !isNaN(val)) total += val;
        }
      }
    }

    return total;
  }

  get refugiosImpactados(): number {
    const ESPACIOS_ACOGIDA = ['albergue/refugio', 'fundacion', 'hogar de paso'];
    return this.filteredReports.filter(r => {
      const iv = r.indicator_values?.find(i => i.indicator_id === 102);
      if (!iv?.value) return false;
      const val = typeof iv.value === 'string' ? iv.value.toLowerCase().trim() : '';
      return ESPACIOS_ACOGIDA.includes(val);
    }).length;
  }

  get emprendedoresCofinanciados(): number {
    return this.filteredReports.filter(
      r => r.component_id === COMPONENT_ID_EMPRENDEDORES
    ).length;
  }

  get lastReportDate(): Date | null {
    if (!this.reports.length) return null;
    const maxDate = Math.max(
      ...this.reports.map(r => new Date(r.created_at).getTime())
    );
    return new Date(maxDate);
  }
}
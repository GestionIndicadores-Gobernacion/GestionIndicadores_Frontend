import { Component, Input, OnChanges, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardData } from '../../table-viewer/table-viewer';

export interface PresupuestalActivity {
  label: string;
  aprop: number;
  ejecutado: number;
  obligaciones: number;
  pagos: number;
  disponible: number;
  pct_ejec: number;
}

export interface PresupuestalGroup {
  code: string;
  label: string;
  aprop: number;
  ejecutado: number;
  obligaciones: number;
  pagos: number;
  disponible: number;
  pct_ejec: number;
  activities: PresupuestalActivity[];
}

@Component({
  selector: 'app-presupuestal-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view.html'
})
export class PresupuestalViewComponent implements OnInit, OnChanges {
  @Input() data!: DashboardData;

  expanded = new Set<string>();
  groups: PresupuestalGroup[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this._loadSource(); }
  ngOnChanges(): void { this._loadSource(); }

  private _loadSource(): void {
    const sec = this.data?.sections?.find(s => s.type === 'grouped_rows');
    this.groups = Array.isArray((sec as any)?.groups) ? [...(sec as any).groups] : [];
    this.cdr.detectChanges();
  }

  trackByCode(_: number, g: PresupuestalGroup): string { return g.code; }

  toggle(code: string): void {
    this.expanded.has(code) ? this.expanded.delete(code) : this.expanded.add(code);
  }

  isExpanded(code: string): boolean { return this.expanded.has(code); }

  formatPesos(val: number): string {
    if (!val && val !== 0) return '$0';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return `$${(val / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000)     return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val.toLocaleString('es-CO')}`;
  }

  formatFull(val: number): string {
    if (!val && val !== 0) return '$0';
    return `$${Math.round(val).toLocaleString('es-CO')}`;
  }

  pctColor(pct: number): string {
    if (pct >= 80) return '#059669';
    if (pct >= 50) return '#2563EB';
    if (pct >= 25) return '#D97706';
    return '#EF4444';
  }

  pctBg(pct: number): string {
    if (pct >= 80) return '#D1FAE5';
    if (pct >= 50) return '#DBEAFE';
    if (pct >= 25) return '#FEF3C7';
    return '#FEE2E2';
  }

  pctLabel(pct: number): string {
    if (pct >= 80) return 'Alto';
    if (pct >= 50) return 'Medio';
    if (pct >= 25) return 'Bajo';
    return 'Crítico';
  }

  kpiAccent(idx: number): string {
    return ['#1B3A6B', '#2563EB', '#0891B2', '#059669'][idx % 4];
  }
}

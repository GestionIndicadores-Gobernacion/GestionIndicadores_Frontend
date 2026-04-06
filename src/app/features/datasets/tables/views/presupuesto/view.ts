import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardData } from '../../table-viewer/table-viewer';
import { DashboardCompletenessComponent } from '../../visualizations/dashboard-completeness/dashboard-completeness';

@Component({
  selector: 'app-presupuesto-view',
  standalone: true,
  imports: [CommonModule, DashboardCompletenessComponent],
  templateUrl: './view.html'
})
export class PresupuestoViewComponent {
  @Input() data!: DashboardData;

  kpis = computed(() => this.data?.kpis ?? []);

  completeness = computed(() =>
    this.data?.sections?.find(s => s.id === '__completeness_presupuesto__')
  );

  ejecucion = computed(() =>
    this.data?.sections?.find(s => s.id === '__ejecucion__')
  );

  porGrupo = computed(() =>
    this.data?.sections?.find(s => s.id === '__por_grupo__')
  );

  porProyecto = computed(() =>
    this.data?.sections?.find(s => s.id === '__por_proyecto__')
  );

  formatPesos(val: number): string {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000)     return `$${(val / 1_000_000).toFixed(1)}M`;
    return `$${val.toLocaleString('es-CO')}`;
  }
}
import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

import { StrategyModel } from '../../../../core/models/strategy.model';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StrategyDashboardComponent } from './strategy-dashboard/strategy-dashboard';
import { StrategyTableComponent } from './strategy-table/strategy-table';
import { FormsModule } from '@angular/forms';

type ViewMode = 'list' | 'dashboard';

@Component({
  selector: 'app-strategy-list',
  standalone: true,
  imports: [CommonModule, StrategyTableComponent, StrategyDashboardComponent, FormsModule],
  templateUrl: './strategy-list.html',
  styleUrl: './strategy-list.css',
})
export class StrategyListComponent implements OnInit {

  viewMode: ViewMode = 'list';

  strategies: StrategyModel[] = [];
  loading = false;

  dashboardStrategies: StrategyModel[] = [];
  loadingDashboard = false;
  dashboardLoaded = false;

  // ── Filtro de año ────────────────────────────────────────────────────────
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  constructor(
    private strategiesService: StrategiesService,
    private router: Router,
    private toast: ToastService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadStrategies();
  }

  setView(mode: ViewMode): void {
    this.viewMode = mode;
    if (mode === 'dashboard' && !this.dashboardLoaded) {
      this.loadDashboard();
    }
    this.cd.detectChanges();
  }

  loadStrategies(): void {
    this.loading = true;
    this.cd.detectChanges();

    this.strategiesService.getAll().subscribe({
      next: (data) => {
        this.strategies = data ?? [];
        this.buildAvailableYears();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.toast.error('No se pudieron cargar las estrategias');
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  // Extrae los años únicos de las estrategias a partir de created_at
  private buildAvailableYears(): void {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    for (const s of this.strategies) {
      const base = new Date(s.created_at).getFullYear();
      const goalsCount = s.annual_goals?.length ?? 4;
      for (let i = 0; i < goalsCount; i++) {
        const year = base + i;
        if (year <= currentYear) {  // ← solo años hasta el actual
          years.add(year);
        }
      }
    }

    this.availableYears = Array.from(years).sort((a, b) => a - b);

    if (!this.availableYears.includes(this.selectedYear) && this.availableYears.length > 0) {
      this.selectedYear = this.availableYears[this.availableYears.length - 1];
    }
  }

  loadDashboard(year?: number): void {
    this.loadingDashboard = true;
    this.dashboardLoaded = false;
    this.cd.detectChanges();

    this.strategiesService.getDashboard(year ?? this.selectedYear).subscribe({
      next: (data) => {
        this.dashboardStrategies = data ?? [];
        this.dashboardLoaded = true;
        this.loadingDashboard = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.toast.error('No se pudo cargar el dashboard');
        this.loadingDashboard = false;
        this.cd.detectChanges();
      }
    });
  }

  onYearChange(year: number): void {
    this.selectedYear = year;
    this.loadDashboard(year);
  }

  goToCreate(): void {
    this.router.navigate(['/reports/strategies/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate([`/reports/strategies/${id}/edit`]);
  }

  deleteStrategy(id: number): void {
    this.toast
      .confirm('¿Eliminar estrategia?', 'Esta acción no se puede deshacer.')
      .then(result => {
        if (!result.isConfirmed) return;
        this.strategiesService.delete(id).subscribe({
          next: () => {
            this.toast.success('Estrategia eliminada correctamente');
            this.dashboardLoaded = false;
            this.loadStrategies();
          },
          error: () => {
            this.toast.error('No se pudo eliminar la estrategia');
          }
        });
      });
  }
}
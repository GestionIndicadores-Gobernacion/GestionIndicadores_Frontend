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
    if (mode === 'dashboard') {
      // Siempre recargar al entrar al dashboard
      this.loadDashboard(this.selectedYear);
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
    const currentYear = new Date().getFullYear();

    this.availableYears = [];
    for (let y = 2024; y <= currentYear; y++) {
      this.availableYears.push(y);
    }

    if (!this.availableYears.includes(this.selectedYear)) {
      this.selectedYear = this.availableYears[this.availableYears.length - 1];
    }
  }

  loadDashboard(year?: number): void {
    this.loadingDashboard = true;
    this.cd.detectChanges();

    this.strategiesService.getDashboard(year ?? this.selectedYear).subscribe({
      next: (data) => {
        this.dashboardStrategies = data ?? [];
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
            this.loadStrategies();
          },
          error: () => {
            this.toast.error('No se pudo eliminar la estrategia');
          }
        });
      });
  }
}
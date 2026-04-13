import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

import { StrategyModel } from '../../../../features/report/models/strategy.model';
import { StrategiesService } from '../../../../features/report/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StrategyTableComponent } from './strategy-table/strategy-table';

@Component({
  selector: 'app-strategy-list',
  standalone: true,
  imports: [CommonModule, StrategyTableComponent],
  templateUrl: './strategy-list.html',
  styleUrl: './strategy-list.css',
})
export class StrategyListComponent implements OnInit {

  strategies: StrategyModel[] = [];
  loading = false;

  constructor(
    private strategiesService: StrategiesService,
    private router: Router,
    private toast: ToastService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStrategies();
  }

  loadStrategies(): void {
    this.loading = true;
    this.cd.detectChanges();
    this.strategiesService.getAll().subscribe({
      next: (data) => {
        this.strategies = data ?? [];
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
          error: () => this.toast.error('No se pudo eliminar la estrategia')
        });
      });
  }
}
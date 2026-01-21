import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComponentModel } from '../../../core/models/component.model';
import { ActivityModel } from '../../../core/models/activity.model';

import { ComponentsService } from '../../../core/services/components.service';
import { ActivitiesService } from '../../../core/services/activities.service';
import { StrategiesService } from '../../../core/services/strategy.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-componente-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './componente-list.html',
  styleUrl: './componente-list.css',
})
export class ComponentesListComponent implements OnInit {

  componentes: ComponentModel[] = [];
  filteredComponents: ComponentModel[] = [];

  activities: ActivityModel[] = [];

  // Maps
  activityMap: Record<number, string> = {};
  activityStrategyMap: Record<number, number> = {};
  strategyMap: Record<number, string> = {};

  loading = true;
  search = '';

  // Paginación
  currentPage = 1;
  pageSize = 8;

  // Ordenamiento
  sortColumn: keyof ComponentModel | 'strategy' | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private componentsService: ComponentsService,
    private activitiesService: ActivitiesService,
    private strategiesService: StrategiesService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  // ==========================
  // 🔄 Carga inicial
  // ==========================
  load() {
    this.loading = true;

    // Estrategias
    this.strategiesService.getAll().subscribe({
      next: (strategies) => {
        this.strategyMap = Object.fromEntries(
          strategies.map(s => [s.id, s.name])
        );

        // Actividades
        this.activitiesService.getAll().subscribe({
          next: (activities) => {
            this.activities = activities;

            this.activityMap = Object.fromEntries(
              activities.map(a => [a.id, a.description])
            );

            this.activityStrategyMap = Object.fromEntries(
              activities.map(a => [a.id, a.strategy_id])
            );

            // Componentes
            this.componentsService.getAll().subscribe({
              next: (comps) => {
                this.componentes = comps;
                this.filteredComponents = comps;
                this.loading = false;
              },
              error: () => {
                this.toast.error('Error al cargar componentes');
                this.loading = false;
              }
            });
          },
          error: () => {
            this.toast.error('Error al cargar actividades');
            this.loading = false;
          }
        });
      },
      error: () => {
        this.toast.error('Error al cargar estrategias');
        this.loading = false;
      }
    });
  }

  // ==========================
  // 🔍 Filtro
  // ==========================
  applyFilter() {
    const term = this.search.toLowerCase();

    this.filteredComponents = this.componentes.filter(c => {
      const activityName =
        this.activityMap[c.activity_id]?.toLowerCase() || '';

      const strategyId =
        this.activityStrategyMap[c.activity_id];

      const strategyName =
        this.strategyMap[strategyId]?.toLowerCase() || '';

      return (
        c.name.toLowerCase().includes(term) ||
        (c.description || '').toLowerCase().includes(term) ||
        activityName.includes(term) ||
        strategyName.includes(term)
      );
    });

    this.currentPage = 1;
  }

  // ==========================
  // 🚀 Navegación
  // ==========================
  goToCreate() {
    this.router.navigate(['/dashboard/components/create']);
  }

  goToEdit(id: number) {
    this.router.navigate([`/dashboard/components/${id}/edit`]);
  }

  // ==========================
  // 🗑 Eliminar
  // ==========================
  deleteComponent(id: number) {
    this.toast.confirm(
      '¿Eliminar componente?',
      'Esta acción no se puede deshacer.'
    ).then(r => {
      if (!r.isConfirmed) return;

      this.componentsService.delete(id).subscribe({
        next: () => {
          this.toast.success('Componente eliminado correctamente');
          this.load();
        },
        error: err => {
          this.toast.error(
            err.error?.message || 'Error al eliminar componente'
          );
        }
      });
    });
  }

  // ==========================
  // ↕ Ordenamiento
  // ==========================
  sortBy(column: keyof ComponentModel | 'strategy') {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  get sortedComponents(): ComponentModel[] {
    if (!this.sortColumn) return this.filteredComponents;

    return [...this.filteredComponents].sort((a, b) => {

      let valA = '';
      let valB = '';

      // 🔥 Ordenar por estrategia (derivado)
      if (this.sortColumn === 'strategy') {
        const strategyIdA = this.activityStrategyMap[a.activity_id];
        const strategyIdB = this.activityStrategyMap[b.activity_id];

        valA = this.strategyMap[strategyIdA] || '';
        valB = this.strategyMap[strategyIdB] || '';
      }
      // 🧱 Ordenamiento normal
      else {
        valA = (a as any)[this.sortColumn]?.toString() || '';
        valB = (b as any)[this.sortColumn]?.toString() || '';
      }

      return this.sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }

  // ==========================
  // 📄 Paginación
  // ==========================
  get paginatedComponents(): ComponentModel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedComponents.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.sortedComponents.length / this.pageSize);
  }
}

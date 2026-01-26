import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityModel } from '../../../../core/models/activity.model';
import { ActivitiesService } from '../../../../core/services/activities.service';
import { StrategiesService } from '../../../../core/services/strategy.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Pagination } from '../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-activities-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Pagination
  ],
  templateUrl: './activities-list.html',
  styleUrl: './activities-list.css',
})
export class ActivitiesListComponent {

  activities: ActivityModel[] = [];
  filteredActivities: ActivityModel[] = [];

  loading = true;
  search = '';

  // PAGINACIÓN
  currentPage = 1;
  pageSize = 8;

  // ORDENAMIENTO
  sortColumn: keyof ActivityModel | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Mapa estrategias
  strategyMap: Record<number, string> = {};

  constructor(
    private activitiesService: ActivitiesService,
    private strategiesService: StrategiesService,
    private router: Router,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.loadStrategiesMap();
    this.loadActivities();
  }

  loadActivities() {
    this.loading = true;

    this.activitiesService.getAll().subscribe({
      next: (res) => {
        this.activities = res;
        this.filteredActivities = res;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Error cargando actividades');
        this.loading = false;
      }
    });
  }

  loadStrategiesMap() {
    this.strategiesService.getAll().subscribe({
      next: (res) => {
        res.forEach(s => this.strategyMap[s.id] = s.name);
      }
    });
  }

  applyFilter() {
    const term = this.search.toLowerCase();

    this.filteredActivities = this.activities.filter(a =>
      a.description.toLowerCase().includes(term)
    );
  }

  // ORDENAMIENTO
  sortBy(column: keyof ActivityModel) {
    if (this.sortColumn === column) {
      this.sortDirection =
        this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  get sortedActivities(): ActivityModel[] {
    if (!this.sortColumn) return this.filteredActivities;

    return [...this.filteredActivities].sort((a: any, b: any) => {
      const valA = (a[this.sortColumn] ?? '').toString().toLowerCase();
      const valB = (b[this.sortColumn] ?? '').toString().toLowerCase();
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedActivities(): ActivityModel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedActivities.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.sortedActivities.length / this.pageSize);
  }

  // NAVEGACIÓN
  goToCreate() {
    this.router.navigate(['/records/activities/create']);
  }

  goToEdit(id: number) {
    this.router.navigate([`/records/activities/${id}/edit`]);
  }

  deleteActivity(id: number) {
    this.toast
      .confirm(
        "¿Eliminar actividad?",
        "Esta acción no se puede deshacer."
      )
      .then(result => {
        if (result.isConfirmed) {

          this.activitiesService.delete(id).subscribe({
            next: () => {
              this.toast.success("Actividad eliminada correctamente");
              this.loadActivities();
            },
            error: (err) => {
              const msg =
                err.error?.message ||
                err.error?.msg ||
                err.error?.description ||
                err.error ||
                "Error al eliminar la actividad";

              this.toast.error(msg);
            }
          });

        }
      });
  }
}

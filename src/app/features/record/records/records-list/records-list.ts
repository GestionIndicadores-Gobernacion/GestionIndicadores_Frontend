import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { RecordModel } from '../../../../core/models/record.model';
import { ActivitiesService } from '../../../../core/services/activities.service';
import { ComponentsService } from '../../../../core/services/components.service';
import { IndicatorsService } from '../../../../core/services/indicators.service';
import { RecordsService } from '../../../../core/services/records.service';
import { StrategiesService } from '../../../../core/services/strategy.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-records-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './records-list.html',
  styleUrl: './records-list.css',
})
export class RecordsListComponent implements OnInit {

  // PAGINACIÓN
  currentPage = 1;
  pageSize = 10;

  // ORDENAMIENTO
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  loading = true;
  search = '';

  isViewer = false;
  user: any = null;

  records: RecordModel[] = [];
  filteredRecords: RecordModel[] = [];

  // MAPAS
  componentMap: Record<number, string> = {};
  activityMap: Record<number, string> = {};
  strategyMap: Record<number, string> = {};
  indicatorMap: Record<number, string> = {};

  // 🔥 MAPAS DE RELACIÓN
  componentActivityMap: Record<number, number> = {};
  activityStrategyMap: Record<number, number> = {};

  constructor(
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService,
    private strategiesService: StrategiesService,
    private activitiesService: ActivitiesService,
    private toast: ToastService
  ) {
    const userString = localStorage.getItem('user');
    if (userString) {
      this.user = JSON.parse(userString);
      this.isViewer = this.user.role?.name === 'Viewer';
    }
  }

  ngOnInit(): void {
    this.loadMaps();
  }

  // ================================
  // Cargar mapas base
  // ================================
  loadMaps() {
    this.strategiesService.getAll().subscribe(strategies => {
      this.strategyMap = Object.fromEntries(
        strategies.map(s => [s.id, s.name])
      );

      this.activitiesService.getAll().subscribe(activities => {
        this.activityMap = Object.fromEntries(
          activities.map(a => [a.id, a.description])
        );

        this.activityStrategyMap = Object.fromEntries(
          activities.map(a => [a.id, a.strategy_id])
        );

        this.componentsService.getAll().subscribe(components => {
          this.componentMap = Object.fromEntries(
            components.map(c => [c.id, c.name])
          );

          this.componentActivityMap = Object.fromEntries(
            components.map(c => [c.id, c.activity_id])
          );

          this.indicatorsService.getAll().subscribe(inds => {
            this.indicatorMap = Object.fromEntries(
              inds.map(i => [i.id, i.name])
            );

            this.loadRecords();
          });
        });
      });
    });
  }

  // ================================
  // Cargar registros
  // ================================
  loadRecords() {
    this.recordsService.getAll().subscribe({
      next: res => {
        this.records = res;
        this.filteredRecords = [...this.records];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al cargar registros');
      }
    });
  }

  // ================================
  // Helpers
  // ================================
  getStrategyName(r: RecordModel): string {
    const actId = this.componentActivityMap[r.component_id];
    const stratId = this.activityStrategyMap[actId];
    return this.strategyMap[stratId] || '—';
  }

  getActivityName(r: RecordModel): string {
    const actId = this.componentActivityMap[r.component_id];
    return this.activityMap[actId] || '—';
  }

  getMunicipios(r: RecordModel): string[] {
    return r.detalle_poblacion?.municipios
      ? Object.keys(r.detalle_poblacion.municipios)
      : [];
  }

  getIndicatorNames(r: RecordModel): string[] {
    const set = new Set<string>();

    if (!r.detalle_poblacion?.municipios) return [];

    Object.values(r.detalle_poblacion.municipios).forEach((mun: any) => {
      Object.keys(mun.indicadores || {}).forEach(ind => set.add(ind));
    });

    return [...set].sort();
  }

  getShort(text: string, max = 60): string {
    return text.length > max ? text.slice(0, max) + '...' : text;
  }

  // ================================
  // FILTRO
  // ================================
  applyFilter() {
    const term = this.search.toLowerCase();

    this.filteredRecords = this.records.filter(r => {
      const strategy = this.getStrategyName(r).toLowerCase();
      const activity = this.getActivityName(r).toLowerCase();
      const component = (this.componentMap[r.component_id] || '').toLowerCase();
      const muni = this.getMunicipios(r).join(', ').toLowerCase();
      const inds = this.getIndicatorNames(r).join(' ').toLowerCase();

      return strategy.includes(term)
        || activity.includes(term)
        || component.includes(term)
        || muni.includes(term)
        || inds.includes(term);
    });

    this.currentPage = 1;
  }

  // ================================
  // ORDENAMIENTO
  // ================================
  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  get sortedRecords(): RecordModel[] {
    if (!this.sortColumn) return this.filteredRecords;

    return [...this.filteredRecords].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (this.sortColumn) {
        case 'strategy':
          valA = this.getStrategyName(a).toLowerCase();
          valB = this.getStrategyName(b).toLowerCase();
          break;

        case 'activity':
          valA = this.getActivityName(a).toLowerCase();
          valB = this.getActivityName(b).toLowerCase();
          break;

        case 'component':
          valA = this.componentMap[a.component_id]?.toLowerCase() || '';
          valB = this.componentMap[b.component_id]?.toLowerCase() || '';
          break;

        case 'municipio':
          valA = this.getMunicipios(a).join(', ').toLowerCase();
          valB = this.getMunicipios(b).join(', ').toLowerCase();
          break;

        case 'indicator':
          valA = this.getIndicatorNames(a)[0] || '';
          valB = this.getIndicatorNames(b)[0] || '';
          break;

        case 'fecha':
          valA = new Date(a.fecha).getTime();
          valB = new Date(b.fecha).getTime();
          break;

        default:
          valA = (a as any)[this.sortColumn] ?? '';
          valB = (b as any)[this.sortColumn] ?? '';
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedRecords() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedRecords.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.sortedRecords.length / this.pageSize);
  }

  // ================================
  // ELIMINAR
  // ================================
  deleteRecord(id: number) {
    this.toast.confirm(
      '¿Eliminar registro?',
      'Esta acción no se puede deshacer.'
    ).then(r => {
      if (!r.isConfirmed) return;

      this.recordsService.delete(id).subscribe({
        next: () => {
          this.toast.success('Registro eliminado correctamente');
          this.loadRecords();
        },
        error: () => {
          this.toast.error('Error eliminando el registro');
        }
      });
    });
  }

  // ================================
  // EXPORTAR EXCEL (corregido)
  // ================================
  exportToExcel() {
    if (!this.records.length) return;

    const workbook = XLSX.utils.book_new();
    const grouped: Record<number, RecordModel[]> = {};

    for (const r of this.records) {
      const actId = this.componentActivityMap[r.component_id];
      const stratId = this.activityStrategyMap[actId] ?? 0;

      grouped[stratId] = grouped[stratId] || [];
      grouped[stratId].push(r);
    }

    Object.keys(grouped).forEach(key => {
      const stratId = Number(key);
      const rows = grouped[stratId];
      const sheetName = this.strategyMap[stratId] || 'Estrategia';

      const data = rows.map(r => ({
        Estrategia: this.getStrategyName(r),
        Actividad: this.getActivityName(r),
        Componente: this.componentMap[r.component_id],
        Municipios: this.getMunicipios(r).join(', '),
        Fecha: r.fecha
      }));

      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
    });

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer]), 'registros.xlsx');
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

}

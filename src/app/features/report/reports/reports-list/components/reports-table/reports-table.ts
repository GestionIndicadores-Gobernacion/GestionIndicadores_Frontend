import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportModel } from '../../../../../../core/models/report.model';
import { Pagination } from '../../../../../../shared/components/pagination/pagination';


const MONTH_ABBR_TO_NUM: Record<string, number> = {
  'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
  'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12,
};

@Component({
  selector: 'app-reports-table',
  standalone: true,
  imports: [CommonModule, RouterModule, Pagination, FormsModule],
  templateUrl: './reports-table.html',
  styleUrl: './reports-table.css',
})
export class ReportsTableComponent implements OnChanges {

  @Input() reports: ReportModel[] = [];
  @Input() strategyMap: Record<number, string> = {};
  @Input() componentMap: Record<number, string> = {};
  @Input() currentUserId: number | null = null;
  @Input() isAdmin = false;
  @Input() chartFilter: { componentId: number | null; label: string | null; year: number | null } = {
    componentId: null,
    label: null,
    year: null,
  };

  @Output() clearFilter = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();

  // VIEW MODE
  viewMode: 'all' | 'mine' = 'all';

  // SEARCH
  searchTerm = '';

  // SORT
  sortColumn: keyof ReportModel | 'strategy_name' = 'report_date';
  sortDirection: 'asc' | 'desc' = 'desc';

  // PAGINATION
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  filteredReports: ReportModel[] = [];
  paginatedReports: ReportModel[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reports'] || changes['strategyMap'] || changes['componentMap']) {
      this.applyAll();
    }

    if (changes['reports'] || changes['strategyMap'] || changes['componentMap'] || changes['chartFilter']) {
      this.applyAll();
    }
  }

  setViewMode(mode: 'all' | 'mine') {
    this.viewMode = mode;
    this.applyAll();
  }

  canModify(report: ReportModel): boolean {
    if (this.isAdmin) return true;
    if (report.user_id === null || report.user_id === undefined) return false;
    return report.user_id === this.currentUserId;
  }

  applyAll(): void {
    this.applyFilter();
    this.applySort();
    this.applyPagination();
  }

  clearChartFilter(): void {
    this.clearFilter.emit();
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredReports = this.reports.filter(r => {
      // Filtro mis reportes
      if (this.viewMode === 'mine' && !this.isOwner(r)) return false;

      // Filtro desde gráfico — componente
      if (this.chartFilter.componentId !== null && r.component_id !== this.chartFilter.componentId) return false;

      if (this.chartFilter.year !== null) {
        const reportYear = new Date(r.report_date).getFullYear();
        if (reportYear !== this.chartFilter.year) return false;
      }

      // Filtro desde gráfico — label (mes o municipio/categoría)
      if (this.chartFilter.label) {
        const label = this.chartFilter.label.toLowerCase().trim();
        const monthNum = MONTH_ABBR_TO_NUM[label];

        if (monthNum) {
          const reportMonth = new Date(r.report_date).getMonth() + 1;
          if (reportMonth !== monthNum) return false;
        } else {
          const matchLocation = (r.intervention_location ?? '').toLowerCase().includes(label);
          if (!matchLocation) return false;
        }
      }

      // Filtro búsqueda libre
      if (!term) return true;

      return (
        r.id.toString().includes(term) ||
        (r.executive_summary ?? '').toLowerCase().includes(term) ||
        (r.intervention_location ?? '').toLowerCase().includes(term) ||
        (r.zone_type ?? '').toLowerCase().includes(term) ||
        this.strategyName(r.strategy_id).toLowerCase().includes(term) ||
        this.componentName(r.component_id).toLowerCase().includes(term)
      );
    });

    this.totalPages = Math.ceil(this.filteredReports.length / this.pageSize) || 1;
    this.currentPage = 1;
  }

  isOwner(report: ReportModel): boolean {
    if (this.isAdmin) return true;
    return report.user_id === this.currentUserId;
  }

  sort(column: keyof ReportModel | 'strategy_name'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
    this.applyPagination();
  }

  applySort(): void {
    this.filteredReports.sort((a, b) => {

      let valA: any;
      let valB: any;

      switch (this.sortColumn) {
        case 'strategy_name':
          valA = this.strategyName(a.strategy_id);
          valB = this.strategyName(b.strategy_id);
          break;

        case 'component_id':
          valA = this.componentName(a.component_id);
          valB = this.componentName(b.component_id);
          break;

        default:
          valA = a[this.sortColumn as keyof ReportModel];
          valB = b[this.sortColumn as keyof ReportModel];
      }

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      return 0;
    });
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedReports = this.filteredReports.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyPagination();
  }

  onDelete(id: number): void {
    this.delete.emit(id);
  }

  strategyName(id: number): string { return this.strategyMap[id] || '—'; }
  componentName(id: number): string { return this.componentMap[id] || '—'; }

  formatZoneType(zoneType: string): string {
    if (!zoneType) return '—';
    const parts = zoneType.split('.');
    const value = parts.length > 1 ? parts[1] : zoneType;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}
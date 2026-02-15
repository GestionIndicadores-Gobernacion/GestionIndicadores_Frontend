import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportModel } from '../../../../../../core/models/report.model';
import { Pagination } from '../../../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-reports-table',
  standalone: true,
  imports: [CommonModule, RouterModule, Pagination, FormsModule, RouterModule],
  templateUrl: './reports-table.html',
  styleUrl: './reports-table.css',
})
export class ReportsTableComponent implements OnChanges {

  @Input() reports: ReportModel[] = [];
  @Input() strategyMap: Record<number, string> = {};

  @Output() delete = new EventEmitter<number>();

  // SEARCH
  searchTerm = '';

  // SORT
  sortColumn: keyof ReportModel | 'strategy_name' = 'report_date';
  sortDirection: 'asc' | 'desc' = 'desc';

  // PAGINATION
  currentPage = 1;
  pageSize = 5;
  totalPages = 1;

  filteredReports: ReportModel[] = [];
  paginatedReports: ReportModel[] = [];

  ngOnChanges(): void {
    this.applyAll();
  }

  // ===============================
  // CORE PIPELINE
  // ===============================
  applyAll(): void {
    this.applyFilter();
    this.applySort();
    this.applyPagination();
  }

  // ===============================
  // FILTER
  // ===============================
  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredReports = this.reports.filter(r => {
      return (
        r.id.toString().includes(term) ||
        r.executive_summary.toLowerCase().includes(term) ||
        r.activities_performed.toLowerCase().includes(term) ||
        r.intervention_location.toLowerCase().includes(term) ||
        r.zone_type.toLowerCase().includes(term) ||
        this.strategyName(r.strategy_id).toLowerCase().includes(term)
      );
    });

    this.totalPages = Math.ceil(this.filteredReports.length / this.pageSize) || 1;
    this.currentPage = 1;
  }

  // ===============================
  // SORT
  // ===============================
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

      if (this.sortColumn === 'strategy_name') {
        valA = this.strategyName(a.strategy_id);
        valB = this.strategyName(b.strategy_id);
      } else {
        valA = a[this.sortColumn];
        valB = b[this.sortColumn];
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

  // ===============================
  // PAGINATION
  // ===============================
  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedReports = this.filteredReports.slice(start, end);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyPagination();
  }

  // ===============================
  // DELETE
  // ===============================
  onDelete(id: number): void {
    this.delete.emit(id);
  }

  // ===============================
  // UTILS
  // ===============================
  strategyName(id: number): string {
    return this.strategyMap[id] || '—';
  }
}

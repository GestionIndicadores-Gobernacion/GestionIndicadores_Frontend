import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { StrategyModel } from '../../../../../features/report/models/strategy.model';
import { Pagination } from '../../../../../shared/components/pagination/pagination';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-strategy-table',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination, LucideAngularModule],
  templateUrl: './strategy-table.html',
})
export class StrategyTableComponent implements OnChanges {

  @Input() strategies: StrategyModel[] = [];

  @Output() edit = new EventEmitter<number>();
  @Output() delete = new EventEmitter<number>();

  // ── Búsqueda ─────────────────────────────────────────────────────────────
  searchTerm = '';

  // ── Paginación ───────────────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // ── Sorting ──────────────────────────────────────────────────────────────
  sortColumn: keyof StrategyModel | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // ── Estado interno ───────────────────────────────────────────────────────
  filteredStrategies: StrategyModel[] = [];
  paginatedStrategies: StrategyModel[] = [];

  constructor(private cd: ChangeDetectorRef) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['strategies']) {
      this.currentPage = 1;
      this.applyFilters();
    }
  }

  // ── Búsqueda ─────────────────────────────────────────────────────────────

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  // ── Filtrado + paginación ────────────────────────────────────────────────

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredStrategies = this.strategies.filter(s =>
      s.name?.toLowerCase().includes(term) ||
      s.objective?.toLowerCase().includes(term) ||
      s.product_goal_description?.toLowerCase().includes(term)
    );

    this.totalPages = Math.max(
      Math.ceil(this.sortedStrategies.length / this.pageSize),
      1
    );

    this.applyPagination();
  }

  sortBy(column: keyof StrategyModel): void {
    this.sortDirection = this.sortColumn === column
      ? (this.sortDirection === 'asc' ? 'desc' : 'asc')
      : 'asc';
    this.sortColumn = column;
    this.applyPagination();
    this.cd.detectChanges();
  }

  get sortedStrategies(): StrategyModel[] {
    if (!this.sortColumn) return this.filteredStrategies;

    return [...this.filteredStrategies].sort((a: any, b: any) => {
      const valA = a[this.sortColumn];
      const valB = b[this.sortColumn];

      if (valA == null) return -1;
      if (valB == null) return 1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (this.sortColumn === 'created_at') {
        return this.sortDirection === 'asc'
          ? new Date(valA).getTime() - new Date(valB).getTime()
          : new Date(valB).getTime() - new Date(valA).getTime();
      }

      const tA = valA.toString().toLowerCase();
      const tB = valB.toString().toLowerCase();
      return this.sortDirection === 'asc'
        ? tA.localeCompare(tB)
        : tB.localeCompare(tA);
    });
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedStrategies = this.sortedStrategies.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyPagination();
    this.cd.detectChanges();
  }
}
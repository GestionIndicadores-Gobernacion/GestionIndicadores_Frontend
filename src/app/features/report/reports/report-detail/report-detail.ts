import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { getIndicatorDisplayName } from '../../../../core/data/indicator-display-names';
import { ReportModel } from '../../../../features/report/models/report.model';
import { ReportsService } from '../../../../features/report/services/reports.service';
import { PageState, PageStateComponent } from '../../../../shared/components/page-state/page-state';

@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, PageStateComponent],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.css',
})
export class ReportDetailComponent implements OnInit {
  isViewer = false;
  report: ReportModel | null = null;
  loading = true;
  error = false;

  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.error) return 'error';
    if (!this.report) return 'empty';
    return 'content';
  }

  reload(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.error = false;
    this.reportsService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => { this.report = r; this.loading = false; this.cd.detectChanges(); },
        error: () => { this.error = true; this.loading = false; this.cd.detectChanges(); }
      });
  }

  private expandedSet = new Set<number>();
  private destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private reportsService: ReportsService,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') ?? 'null');
    this.isViewer = user?.role?.name === 'viewer';
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.reportsService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => { this.report = r; this.loading = false; this.cd.detectChanges(); },
        error: () => { this.error = true; this.loading = false; this.cd.detectChanges(); }
      });
  }

  // ── Expand/collapse ────────────────────────────────────────────────────────
  toggleExpanded(id: number): void {
    this.expandedSet.has(id) ? this.expandedSet.delete(id) : this.expandedSet.add(id);
  }
  isExpanded(id: number): boolean { return this.expandedSet.has(id); }

  // ── Type guards ────────────────────────────────────────────────────────────
  isSimpleNumber(value: any): boolean {
    return typeof value === 'number';
  }

  isSimpleText(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return false;
    if (typeof value === 'object') return false;
    const s = this.cleanStringValue(value);
    return !this.isValidUrl(s);
  }

  isUrlValue(value: any): boolean {
    if (value === null || value === undefined || typeof value === 'object') return false;
    return this.isValidUrl(this.cleanStringValue(value));
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object';
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isSimpleDict(value: any): boolean {
    if (Array.isArray(value) || typeof value !== 'object' || value === null) return false;
    return Object.values(value).every(v => typeof v === 'number' || typeof v === 'string');
  }

  // ── Conversores ────────────────────────────────────────────────────────────
  asArray(value: any): any[] {
    return Array.isArray(value) ? value : [];
  }

  asNumber(value: any): number {
    return Number(value);
  }

  cleanStringValue(value: any): string {
    if (value === null || value === undefined) return '—';
    const s = String(value).trim();
    if (s.startsWith('"') && s.endsWith('"')) {
      try { return JSON.parse(s); } catch { return s; }
    }
    return s;
  }

  dictEntries(value: any): { key: string; value: any }[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    return Object.entries(value).map(([key, val]) => ({ key, value: val }));
  }

  dictTotal(value: any): number {
    if (!value || typeof value !== 'object') return 0;
    return Object.values(value).reduce((acc: number, v) =>
      acc + (typeof v === 'number' ? v : 0), 0);
  }

  /** Suma total de todos los valores numéricos en un objeto anidado. */
  nestedTotal(value: any): number {
    const rows = this.flattenNestedValue(value);
    return rows.reduce((acc, r) => acc + r.total, 0);
  }

  /** Resumen por clave de primer nivel — agrupa CANINO, FELINO, etc. */
  topLevelSummary(value: any): { label: string; total: number }[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const result: { label: string; total: number }[] = [];
    for (const [k, v] of Object.entries(value)) {
      if (k === 'sub_sections' || k === 'selected_categories') continue;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        const rows = this.flattenNestedValue(v);
        const total = rows.reduce((acc, r) => acc + r.total, 0);
        result.push({ label: k, total });  // ← sin filtro > 0
      }
    }
    return result;
  }

  flattenNestedValue(value: any): { label: string; total: number }[] {
    const result: { label: string; total: number }[] = [];
    const recurse = (obj: any, prefix: string) => {
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'sub_sections' || k === 'selected_categories') continue;
        if (typeof v === 'number') {
          result.push({ label: prefix ? `${prefix} › ${k}` : k, total: v });
        } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          recurse(v, prefix ? `${prefix} › ${k}` : k);
        }
      }
    };
    recurse(value, '');
    // Solo filtrar null/undefined, NO filtrar ceros
    return result.filter(r => r.total !== null && r.total !== undefined);
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  indicatorName(id: number, fallback: string): string {
    return getIndicatorDisplayName(id, fallback);
  }

  formatZone(z: string): string {
    if (!z) return '—';
    const parts = z.split('.');
    const v = parts.length > 1 ? parts[1] : z;
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }

  isValidUrl(url: string): boolean {
    try { new URL(url); return true; } catch { return false; }
  }

  formatIndicatorLabel(label: string): string {
    if (!label) return '';
    return label
      .replace(/^data\s*›\s*/i, '')
      .replace(/_/g, ' ')
      .split(' › ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' · ');
  }
}
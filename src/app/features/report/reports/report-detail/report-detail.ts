import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { getIndicatorDisplayName } from '../../../../core/data/indicator-display-names';
import { ReportModel } from '../../../../core/models/report.model';
import { ReportsService } from '../../../../core/services/reports.service';

@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.css',
})
export class ReportDetailComponent implements OnInit {

  report: ReportModel | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private reportsService: ReportsService,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.reportsService.getById(id).subscribe({
      next: (r) => {
        this.report = r;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  indicatorName(id: number, fallback: string): string {
    return getIndicatorDisplayName(id, fallback);
  }

  formatValue(value: any, fieldType?: string): string {
    if (value === null || value === undefined) return '—';
    if (typeof value !== 'object') return String(value);

    // sum_group: { "CANINO": { "Hembra": { "no_de_animales_...": 0 } } }
    // grouped_data, categorized_group → object plano { "categoria": número }
    return ''; // el HTML lo maneja con helpers
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


  isObject(value: any): boolean {
    return value !== null && typeof value === 'object';
  }

  objectEntries(value: any): { key: string; val: any }[] {
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).map(([key, val]) => ({ key, val }));
  }

  isNestedObject(val: any): boolean {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  flattenNestedValue(value: any): { label: string; total: number }[] {
    const result: { label: string; total: number }[] = [];

    const recurse = (obj: any, prefix: string) => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'number') {
          result.push({ label: prefix ? `${prefix} › ${k}` : k, total: v });
        } else if (typeof v === 'object' && v !== null) {
          recurse(v, prefix ? `${prefix} › ${k}` : k);
        }
      }
    };

    recurse(value, '');
    return result.filter(r => r.total > 0);
  }
}
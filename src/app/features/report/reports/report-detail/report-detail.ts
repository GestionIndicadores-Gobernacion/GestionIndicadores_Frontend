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
  isViewer = false;

  report: ReportModel | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private reportsService: ReportsService,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    
    const user = JSON.parse(localStorage.getItem('user') ?? 'null');
    this.isViewer = user?.role?.name === 'viewer';
    
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

  formatZone(z: string): string {
    if (!z) return '—';
    const parts = z.split('.');
    const v = parts.length > 1 ? parts[1] : z;
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }

  isValidUrl(url: string): boolean {
    try { new URL(url); return true; }
    catch { return false; }
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object';
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

  flattenNestedValue(value: any): { label: string; total: number }[] {

    const result: { label: string; total: number }[] = [];

    const recurse = (obj: any, prefix: string) => {

      for (const [k, v] of Object.entries(obj)) {

        if (typeof v === 'number') {

          result.push({
            label: prefix ? `${prefix} › ${k}` : k,
            total: v
          });

        }

        else if (typeof v === 'object' && v !== null) {

          recurse(v, prefix ? `${prefix} › ${k}` : k);

        }

      }

    };

    recurse(value, '');

    return result.filter(r => r.total !== null && r.total !== undefined);

  }

}
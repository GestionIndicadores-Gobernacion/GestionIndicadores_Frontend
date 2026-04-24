import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ChangeDetectorRef, ViewChild, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ReportModel } from '../../../../features/report/models/report.model';

import { ReportsService } from '../../../../features/report/services/reports.service';
import { StrategiesService } from '../../../../features/report/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UsersService } from '../../../../features/user/services/users.service';

import { ReportsTableComponent } from './components/reports-table/reports-table';
import { ComponentsService } from '../../../../features/report/services/components.service';
import { LucideAngularModule } from 'lucide-angular';
import { PageState, PageStateComponent } from '../../../../shared/components/page-state/page-state';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReportsTableComponent,
    LucideAngularModule,
    PageStateComponent,
  ],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css',
})
export class ReportsListComponent implements OnInit {

  reports: ReportModel[] = [];
  strategyMap: Record<number, string> = {};
  componentMap: Record<number, string> = {};

  @ViewChild('tableSection') tableSection!: ElementRef;

  loading = true;
  loadError = false;
  currentUserId: number | null = null;
  isAdmin = false;
  isViewer = false;

  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.loadError) return 'error';
    if (!this.reports.length) return 'empty';
    return 'content';
  }


  chartFilter: { componentId: number | null; label: string | null; year: number | null } = {
    componentId: null,
    label: null,
    year: null,
  };

  private destroyRef = inject(DestroyRef);

  constructor(
    private reportsService: ReportsService,
    private strategiesService: StrategiesService,
    private usersService: UsersService,
    private componentsService: ComponentsService,
    private toast: ToastService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.usersService.getMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: user => {
        this.currentUserId = user.id;
        this.isAdmin = user.role?.name === 'admin';
        this.isViewer = user.role?.name === 'viewer';
        this.cd.detectChanges();
      },
      error: () => {
        this.isAdmin = false;
        this.cd.detectChanges();
      }
    });

    this.loadData();

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.chartFilter = {
        componentId: params['component'] ? Number(params['component']) : null,
        label: params['label'] ?? null,
        year: params['year'] ? Number(params['year']) : null,
      };

      if (params['component'] || params['label']) {
        setTimeout(() => {
          this.tableSection?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }

      this.cd.detectChanges();
    });
  }

  clearChartFilter(): void {
    this.chartFilter = { componentId: null, label: null, year: null };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
    this.cd.detectChanges();
  }

  deleteReport(id: number): void {
    this.toast.confirm('Eliminar reporte', 'Esta acción no se puede deshacer.')
      .then(result => {
        if (!result.isConfirmed) return;

        this.reportsService.delete(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.reports = this.reports.filter(r => r.id !== id);
            this.toast.success('Reporte eliminado correctamente');
            this.cd.detectChanges();
          },
          error: () => this.toast.error('Error al eliminar el reporte')
        });
      });
  }

  reload(): void {
    this.loading = true;
    this.loadError = false;
    this.loadData();
  }

  private loadData(): void {
    this.strategiesService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: strategies => {
        this.strategyMap = Object.fromEntries(strategies.map(s => [s.id, s.name]));

        this.componentsService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (resp: any) => {
            const components = Array.isArray(resp) ? resp
              : Array.isArray(resp?.data) ? resp.data
                : Array.isArray(resp?.items) ? resp.items : [];

            this.componentMap = Object.fromEntries(components.map((c: any) => [c.id, c.name]));
            this.loadReports();
          },
          error: () => {
            this.componentMap = {};
            this.loadReports();
          }
        });
      },
      error: () => {
        this.strategyMap = {};
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  private loadReports(): void {
    this.reportsService.getAllForDashboard().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: reports => {
        this.reports = reports ?? [];
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.reports = [];
        this.loadError = true;
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }
}
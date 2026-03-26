import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ReportModel } from '../../../../core/models/report.model';

import { ReportsService } from '../../../../core/services/reports.service';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UsersService } from '../../../../core/services/users.service';

import { ReportsTableComponent } from './components/reports-table/reports-table';
import { ReportsAuditLogComponent } from './components/reports-audit-log/reports-audit-log';
import { ComponentsService } from '../../../../core/services/components.service';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReportsTableComponent,
    ReportsAuditLogComponent,
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
  currentUserId: number | null = null;
  isAdmin = false;
  isViewer = false;


  chartFilter: { componentId: number | null; label: string | null; year: number | null } = {
    componentId: null,
    label: null,
    year: null,
  };

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
    this.usersService.getMe().subscribe({
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

    this.route.queryParams.subscribe(params => {
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

        this.reportsService.delete(id).subscribe({
          next: () => {
            this.reports = this.reports.filter(r => r.id !== id);
            this.toast.success('Reporte eliminado correctamente');
            this.cd.detectChanges();
          },
          error: () => this.toast.error('Error al eliminar el reporte')
        });
      });
  }

  private loadData(): void {
    this.strategiesService.getAll().subscribe({
      next: strategies => {
        this.strategyMap = Object.fromEntries(strategies.map(s => [s.id, s.name]));

        this.componentsService.getAll().subscribe({
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
    this.reportsService.getAllForDashboard().subscribe({
      next: reports => {
        this.reports = reports ?? [];
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.reports = [];
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }
}
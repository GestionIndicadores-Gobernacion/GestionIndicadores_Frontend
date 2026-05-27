import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ChangeDetectorRef, ViewChild, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { ReportModel } from '../../../../features/report/models/report.model';

import { ReportsService } from '../../../../features/report/services/reports.service';
import { StrategiesService } from '../../../../features/report/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';

import { ReportsTableComponent } from './components/reports-table/reports-table';
import { ComponentsService } from '../../../../features/report/services/components.service';
import { LucideAngularModule } from 'lucide-angular';
import { PageState, PageStateComponent } from '../../../../shared/components/page-state/page-state';
import { PermissionService } from '../../../../core/services/permission.service';
import { PERMS, ROLE_IDS } from '../../../../core/constants/permissions';
import { CanDirective } from '../../../../shared/directives/can';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReportsTableComponent,
    LucideAngularModule,
    PageStateComponent,
    CanDirective,
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
  isViewer = false;
  /** True si el user tiene PERM_REPORTS_UPDATE_ANY explícitamente. Override granular para editar reportes ajenos. */
  canEditAny = false;
  /** True si el user tiene PERM_REPORTS_DELETE_ANY explícitamente. Override granular para eliminar reportes ajenos. */
  canDeleteAny = false;

  readonly PERMS = PERMS;
  readonly ROLE_IDS = ROLE_IDS;

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
    private componentsService: ComponentsService,
    private authService: AuthService,
    private permissionService: PermissionService,
    private toast: ToastService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    // Datos del usuario actual desde la sesión local — evita el round-trip
    // a /users/me en cada entrada a la pantalla. La sesión se guarda en
    // login() y solo cambia con login/logout, así que es consistente.
    const user = this.authService.getUser();
    this.currentUserId = user?.id ?? null;

    // isViewer mantiene fallback de rol porque "puede crear" sigue siendo
    // una capacidad de rol (no hay PERM_REPORTS_CREATE_ANY ni similar).
    const payload = this.authService.getTokenPayload();
    const roleId = payload?.role_id ?? null;
    this.isViewer = !this.permissionService.hasPermissionOrRole(
      PERMS.REPORTS_CREATE, roleId, ROLE_IDS.ADMIN, ROLE_IDS.EDITOR, ROLE_IDS.MONITOR
    );
    // Overrides granulares: cada operación consulta su propio permiso sin
    // caer al rol admin. Admin sin el permiso pierde el override.
    this.canEditAny = this.permissionService.hasPermission(PERMS.REPORTS_UPDATE_ANY);
    this.canDeleteAny = this.permissionService.hasPermission(PERMS.REPORTS_DELETE_ANY);

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
    // Las tres requests son independientes (strategies y components solo
    // alimentan mapas id→nombre; reports es la fuente de filas). Se
    // disparan en paralelo y se ensamblan en un único `next`. Si alguna
    // falla, las otras siguen su curso gracias al `catchError` local.
    forkJoin({
      strategies: this.strategiesService.getSummary().pipe(catchError(() => of([]))),
      components: this.componentsService.getSummary().pipe(catchError(() => of([]))),
      reports:    this.reportsService.getAllForDashboard().pipe(
        catchError(() => { this.loadError = true; return of([] as ReportModel[]); })
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ strategies, components, reports }) => {
        this.strategyMap  = Object.fromEntries(strategies.map(s => [s.id, s.name]));
        this.componentMap = Object.fromEntries(components.map(c => [c.id, c.name]));
        this.reports      = reports ?? [];
        this.loading      = false;
        this.cd.detectChanges();
      });
  }
}
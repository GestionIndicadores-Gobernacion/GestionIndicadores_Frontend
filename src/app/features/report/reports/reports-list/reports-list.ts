import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReportModel } from '../../../../core/models/report.model';
import { ReportsService } from '../../../../core/services/reports.service';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ReportsKpiCardsComponent } from './components/reports-kpi-cards/reports-kpi-cards';
import { ReportsTableComponent } from './components/reports-table/reports-table';
import { ReportsTimelineComponent } from './components/reports-timeline/reports-timeline';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [
    CommonModule,
    ReportsKpiCardsComponent,
    ReportsTimelineComponent,
    ReportsTableComponent,
    RouterModule
  ],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css',
})
export class ReportsListComponent implements OnInit {

  reports: ReportModel[] = [];
  strategyMap: Record<number, string> = {};

  showDashboard = false;

  loading = false;

  constructor(
    private reportsService: ReportsService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  toggleDashboard(): void {
    this.showDashboard = !this.showDashboard;
  }

  deleteReport(id: number): void {

    this.toast.confirm(
      'Eliminar reporte',
      'Esta acción no se puede deshacer.'
    ).then(result => {

      if (!result.isConfirmed) return;

      this.reportsService.delete(id).subscribe({
        next: () => {
          this.reports = this.reports.filter(r => r.id !== id);
          this.toast.success('Reporte eliminado correctamente');
        },
        error: () => {
          this.toast.error('Error al eliminar el reporte');
        }
      });

    });
  }



  // ===============================
  // DATA LOADING
  // ===============================
  private loadData(): void {
    this.loading = true;

    this.strategiesService.getAll().subscribe({
      next: strategies => {
        this.strategyMap = Object.fromEntries(
          strategies.map(s => [s.id, s.name])
        );

        this.loadReports();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadReports(): void {
    this.reportsService.getAll().subscribe({
      next: reports => {
        this.reports = reports;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // ===============================
  // DERIVED METRICS
  // ===============================

  get totalReports(): number {
    return this.reports.length;
  }

  get reportsThisMonth(): number {
    const now = new Date();
    return this.reports.filter(r => {
      const date = new Date(r.created_at);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;
  }

}

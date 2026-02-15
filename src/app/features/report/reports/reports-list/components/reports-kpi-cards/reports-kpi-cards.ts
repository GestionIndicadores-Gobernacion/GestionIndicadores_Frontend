import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReportModel } from '../../../../../../core/models/report.model';

@Component({
  selector: 'app-reports-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-kpi-cards.html',
  styleUrl: './reports-kpi-cards.css',
})
export class ReportsKpiCardsComponent {
  @Input() reports: ReportModel[] = [];

  get totalReports(): number {
    return this.reports.length;
  }

  get totalStrategies(): number {
    return new Set(this.reports.map(r => r.strategy_id)).size;
  }

  get totalComponents(): number {
    return new Set(this.reports.map(r => r.component_id)).size;
  }

  get totalZones(): number {
    return new Set(this.reports.map(r => r.zone_type)).size;
  }

  get lastReportDate(): Date | null {
    if (!this.reports.length) return null;

    const maxDate = Math.max(
      ...this.reports.map(r => new Date(r.created_at).getTime())
    );

    return new Date(maxDate);
  }

  get totalIndicators(): number {
    const ids = new Set<number>();

    this.reports.forEach(r => {
      r.indicator_values?.forEach(i => ids.add(i.indicator_id));
    });

    return ids.size;
  }
}

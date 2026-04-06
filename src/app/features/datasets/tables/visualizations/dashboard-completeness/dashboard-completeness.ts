import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashBar } from '../dashboard-bar/dashboard-bar';

@Component({
  selector: 'dashboard-completeness',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-completeness.html'
})
export class DashboardCompletenessComponent {
  @Input() bars: DashBar[] = [];

  colorFor(pct: number): string {
    if (pct >= 80) return '#15803D';
    if (pct >= 50) return '#D97706';
    return '#DC2626';
  }

  bgFor(pct: number): string {
    if (pct >= 80) return '#DCFCE7';
    if (pct >= 50) return '#FEF3C7';
    return '#FEE2E2';
  }

  labelFor(pct: number): string {
    if (pct >= 80) return 'Buena';
    if (pct >= 50) return 'Media';
    return 'Baja';
  }
}
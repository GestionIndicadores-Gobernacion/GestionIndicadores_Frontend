import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type KpiCardConfig = {
  label: string;
  key: string;
  colorClass: string;
};

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './kpi-cards.html',
  styleUrl: './kpi-cards.css',
})
export class KpiCardsComponent {
  @Input() kpiCards: KpiCardConfig[] = [];
  @Input() kpis: Record<string, number> = {};
}

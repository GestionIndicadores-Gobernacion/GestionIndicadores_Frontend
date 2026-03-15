import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-card.html',
  styleUrl: './dashboard-card.css',
})
export class DashboardCardComponent {
  @Input() title!: string;
  @Input() value!: number | string;
  @Input() description!: string;
  @Input() color: 'blue' | 'red' | 'green' | 'indigo' | 'orange' | 'purple' | 'cyan' = 'blue';

  private readonly gradients: Record<string, string> = {
    blue: 'linear-gradient(to right, #1e3a8a, #2563eb, #1e3a8a)',
    red: 'linear-gradient(to right, #dc2626, #ef4444, #dc2626)',
    green: 'linear-gradient(to right, #16a34a, #22c55e, #16a34a)',
    indigo: 'linear-gradient(to right, #4338ca, #6366f1, #4338ca)',
    orange: 'linear-gradient(to right, #ea580c, #f97316, #ea580c)',
    purple: 'linear-gradient(to right, #9333ea, #a855f7, #9333ea)',
    cyan: 'linear-gradient(to right, #0891b2, #06b6d4, #0891b2)',
  };

  private readonly borderColors: Record<string, string> = {
    blue: '#dbeafe',
    red: '#fee2e2',
    green: '#dcfce7',
    indigo: '#e0e7ff',
    orange: '#ffedd5',
    purple: '#f3e8ff',
    cyan: '#cffafe',
  };

  private readonly iconColors: Record<string, { bg: string; text: string }> = {
    blue: { bg: '#eff6ff', text: '#1d4ed8' },
    red: { bg: '#fef2f2', text: '#dc2626' },
    green: { bg: '#f0fdf4', text: '#16a34a' },
    indigo: { bg: '#eef2ff', text: '#4338ca' },
    orange: { bg: '#fff7ed', text: '#ea580c' },
    purple: { bg: '#faf5ff', text: '#9333ea' },
    cyan: { bg: '#ecfeff', text: '#0891b2' },
  };

  get barStyle() {
    return { background: this.gradients[this.color] };
  }

  get borderStyle() {
    return { 'border-color': this.borderColors[this.color] };
  }

  get iconStyle() {
    const c = this.iconColors[this.color];
    return { 'background-color': c.bg, color: c.text };
  }
}
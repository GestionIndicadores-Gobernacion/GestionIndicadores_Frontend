import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dashboard-histogram',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="space-y-2">

    <div *ngFor="let bar of bars"
         class="flex items-center gap-3">

      <span class="text-xs w-28 text-right font-medium truncate"
            style="color:#4A6A9B;">
        {{ bar.label }}
      </span>

      <div class="flex-1 rounded-xl overflow-hidden h-6 relative"
           style="background:#E6EDF7;border:1px solid #D6E0F0;">

        <div class="h-full rounded-xl flex items-center justify-end px-2 text-white text-xs font-semibold transition-all duration-300"
             [style.width.%]="bar.pct"
             [style.background]="bar.color || 'linear-gradient(90deg,#1B3A6B,#2d5fa8)'">

        </div>

      </div>

      <span class="text-xs w-12 text-right font-semibold"
            style="color:#1B3A6B;">
        {{ bar.value }}
      </span>

    </div>

  </div>
  `
})
export class DashboardHistogramComponent {
  @Input() bars: any[] = [];
}
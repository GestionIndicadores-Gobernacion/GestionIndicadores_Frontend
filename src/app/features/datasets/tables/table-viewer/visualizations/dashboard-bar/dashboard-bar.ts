import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DashBar {
  label: string;
  value: number;
  pct: number;
  color: string;
}

@Component({
  selector: 'dashboard-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="space-y-2">

    <div *ngFor="let bar of bars"
         class="flex items-center gap-3">

      <span class="text-xs w-32 truncate text-right font-medium"
            style="color:#4A6A9B;">
        {{ bar.label }}
      </span>

      <div class="flex-1 rounded-xl overflow-hidden h-7 relative"
           style="background:#E6EDF7;border:1px solid #D6E0F0;">

        <div class="h-full rounded-xl flex items-center justify-between px-3 text-white text-xs font-semibold shadow-sm transition-all duration-300"
             [style.width.%]="bar.pct"
             [style.background]="bar.color">

          <span class="truncate">
            {{ bar.value }}
          </span>

          <span class="ml-2 opacity-90">
            {{ bar.pct }}%
          </span>

        </div>

      </div>

    </div>

  </div>
  `
})
export class DashboardBarComponent {
  @Input() bars: DashBar[] = [];
}
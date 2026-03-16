import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dashboard-donut',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="space-y-2.5">

    <div *ngFor="let seg of segments"
         class="flex items-center gap-3">

      <span class="text-xs w-32 text-right font-medium truncate"
            style="color:#4A6A9B;">
        {{ seg.label }}
      </span>

      <div class="flex-1 h-4 rounded-full overflow-hidden relative"
           style="background:#E6EDF7;border:1px solid #D6E0F0;">

        <div class="h-full rounded-full transition-all duration-300"
             [style.width.%]="seg.pct"
             [style.background]="seg.color || 'linear-gradient(90deg,#1B3A6B,#2d5fa8)'">
        </div>

      </div>

      <span class="text-xs w-10 text-right font-semibold"
            style="color:#1B3A6B;">
        {{ seg.pct }}%
      </span>

    </div>

  </div>
  `
})
export class DashboardDonutComponent {
  @Input() segments: any[] = [];
}
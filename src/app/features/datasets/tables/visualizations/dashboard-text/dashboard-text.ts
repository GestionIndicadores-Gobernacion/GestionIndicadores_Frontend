import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dashboard-text',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="space-y-3">

    <div *ngFor="let t of texts"
         class="rounded-xl p-3 text-xs border transition-all duration-150"
         style="background:#F0F4FA;border-color:#D6E0F0;color:#1B3A6B;"
         onmouseover="this.style.background='#E7F0FF'"
         onmouseout="this.style.background='#F0F4FA'">

      {{ t }}

    </div>

  </div>
  `
})
export class DashboardTextComponent {

  @Input() texts: string[] = [];

}
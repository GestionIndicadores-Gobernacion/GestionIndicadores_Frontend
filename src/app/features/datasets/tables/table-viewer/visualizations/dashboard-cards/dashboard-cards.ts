import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dashboard-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

    <div *ngFor="let card of cards"
         class="rounded-2xl border shadow-sm overflow-hidden transition-all duration-150 hover:shadow-md"
         style="border-color:#D6E0F0;background:white;">

      <!-- TOP COLOR BAR -->
      <div class="h-[4px]"
           style="background:linear-gradient(90deg,#1B3A6B,#2d5fa8);">
      </div>

      <div class="p-5 space-y-3">

        <!-- HEADER -->
        <div>

          <div class="font-bold text-[13px]"
               style="color:#1B3A6B;">
            {{ card.name }}
          </div>

          <div class="text-xs mt-1"
               style="color:#6F8CB8;">
            {{ card.municipio }}
          </div>

        </div>

        <!-- METRICS -->
        <div class="grid grid-cols-2 gap-3 pt-2">

          <div class="rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-between"
               style="background:#F0F4FA;border:1px solid #D6E0F0;color:#1B3A6B;">

            <span class="flex items-center gap-1">
              🐶
              Perros
            </span>

            <span>
              {{ card.perros }}
            </span>

          </div>

          <div class="rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-between"
               style="background:#F0F4FA;border:1px solid #D6E0F0;color:#1B3A6B;">

            <span class="flex items-center gap-1">
              🐱
              Gatos
            </span>

            <span>
              {{ card.gatos }}
            </span>

          </div>

        </div>

        <!-- CAPACITY -->
        <div *ngIf="card.capacidad"
             class="rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-between"
             style="background:#E7F0FF;border:1px solid #C9DBF2;color:#1B3A6B;">

          <span>
            Capacidad
          </span>

          <span>
            {{ card.capacidad }}
          </span>

        </div>

      </div>

    </div>

  </div>
  `
})
export class DashboardCardsComponent {

  @Input() cards: any[] = [];

}
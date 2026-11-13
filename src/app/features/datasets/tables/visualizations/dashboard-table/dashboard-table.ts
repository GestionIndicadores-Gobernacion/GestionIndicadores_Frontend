import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dashboard-table',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="overflow-auto rounded-2xl border"
       style="border-color:#D6E0F0;background:white;max-height:32rem;">

    <table class="w-full text-sm">

      <!-- HEADER -->
      <thead class="sticky top-0" style="background:#F0F4FA;">

        <tr class="border-b" style="border-color:#D6E0F0;">

          <th class="text-left py-3 px-4 text-xs font-bold w-12" style="color:#94A3B8;">#</th>

          <th *ngFor="let col of columns"
              class="text-left py-3 px-4 text-xs font-bold uppercase tracking-wide"
              style="color:#1B3A6B;">

            {{ col }}

          </th>

        </tr>

      </thead>

      <!-- BODY -->
      <tbody>

        <tr *ngFor="let row of rows; let i = index"
            class="border-b transition-colors"
            style="border-color:#EDF2F8;"
            onmouseover="this.style.background='#F8FAFD'"
            onmouseout="this.style.background='transparent'">

          <td class="py-3 px-4 text-[12px] tabular-nums" style="color:#94A3B8;">{{ i + 1 }}</td>

          <td *ngFor="let col of columns"
              class="py-3 px-4 text-[13px]"
              style="color:#4A6A9B;">

            {{ row[col] }}

          </td>

        </tr>

      </tbody>

    </table>

  </div>
  `
})
export class DashboardTableComponent {

  @Input() columns: string[] = [];
  @Input() rows: any[] = [];

}
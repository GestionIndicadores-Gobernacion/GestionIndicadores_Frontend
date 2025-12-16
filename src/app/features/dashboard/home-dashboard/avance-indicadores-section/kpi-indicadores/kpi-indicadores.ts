import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-indicadores',
  imports: [CommonModule],
  templateUrl: './kpi-indicadores.html',
  styleUrl: './kpi-indicadores.css',
})
export class KpiIndicadoresComponent {
  @Input() indicadores: any[] = [];
}

import { Component, Input, OnChanges, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DashSegment {
  label: string;
  value: number;
  pct: number;
  color: string;
}

@Component({
  selector: 'dashboard-donut',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-donut.html'
})
export class DashboardDonutComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() segments: DashSegment[] = [];
  @ViewChild('donutCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart: any;
  private initialized = false;

  ngAfterViewInit() { this.initialized = true; this.render(); }
  ngOnChanges() { if (!this.initialized) return; this.destroy(); this.render(); }
  ngOnDestroy() { this.destroy(); }

  private destroy() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  }

  /** Detecta si los valores son monetarios y formatea en consecuencia. */
  formatSegment(val: number): string {
    const isMoney = this.segments.some(s => s.value >= 1_000_000);
    if (!isMoney) return val.toLocaleString('es-CO');
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val.toLocaleString('es-CO')}`;
  }

  private async render() {
    if (!this.canvasRef?.nativeElement || !this.segments.length) return;

    const { Chart, ArcElement, DoughnutController, Tooltip } = await import('chart.js');
    Chart.register(ArcElement, DoughnutController, Tooltip);

    const isMoney = this.segments.some(s => s.value >= 1_000_000);

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.segments.map(s => s.label),
        datasets: [{
          data: this.segments.map(s => s.value),
          backgroundColor: this.segments.map(s => s.color),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const val = ctx.raw as number;
                const seg = this.segments[ctx.dataIndex];
                const fval = isMoney ? this.formatSegment(val) : val.toLocaleString('es-CO');
                return ` ${ctx.label}: ${fval} (${seg?.pct}%)`;
              }
            }
          }
        }
      }
    });
  }
}
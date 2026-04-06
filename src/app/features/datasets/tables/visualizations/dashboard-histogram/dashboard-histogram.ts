import { Component, Input, OnChanges, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashBar } from '../dashboard-bar/dashboard-bar';

@Component({
  selector: 'dashboard-histogram',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-histogram.html'
})
export class DashboardHistogramComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() bars: DashBar[] = [];
  @ViewChild('histCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart: any;
  private initialized = false;

  ngAfterViewInit() {
    this.initialized = true;
    this.render();
  }

  ngOnChanges() {
    if (!this.initialized) return;
    this.destroy();
    this.render();
  }

  ngOnDestroy() {
    this.destroy();
  }

  private destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private async render() {
    if (!this.canvasRef?.nativeElement || !this.bars.length) return;

    const { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip } = await import('chart.js');
    Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip);

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.bars.map(b => b.label),
        datasets: [{
          data: this.bars.map(b => b.value),
          backgroundColor: this.bars.map(b => b.color),
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} personas` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94A3B8' } },
          y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 11 }, color: '#94A3B8' } }
        }
      }
    });
  }
}
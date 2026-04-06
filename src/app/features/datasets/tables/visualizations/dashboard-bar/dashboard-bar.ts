import { Component, Input, OnChanges, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
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
  templateUrl: './dashboard-bar.html'
})
export class DashboardBarComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() bars: DashBar[] = [];
  @Input() vertical = false;
  @ViewChild('barCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
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

    const isVertical = this.vertical || this.bars.length <= 6;

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.bars.map(b => b.label),
        datasets: [{
          data: this.bars.map(b => b.value),
          backgroundColor: this.bars.map(b => b.color),
          borderRadius: 5,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: isVertical ? 'x' : 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} registros` } }
        },
        scales: {
          x: {
            grid: { display: !isVertical, color: 'rgba(0,0,0,0.06)' },
            ticks: { font: { size: 11 }, color: '#94A3B8', maxRotation: isVertical ? 35 : 0 }
          },
          y: {
            grid: { display: isVertical, color: 'rgba(0,0,0,0.06)' },
            ticks: { font: { size: 11 }, color: '#94A3B8' }
          }
        }
      }
    });
  }
}
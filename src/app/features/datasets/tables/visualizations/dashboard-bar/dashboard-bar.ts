import { Component, Input, OnChanges, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DashBar {
  label: string;
  value: number;
  pct: number;
  color: string;
}

function formatVal(val: number): string {
  if (!val && val !== 0) return '0';
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  // Si el valor es pequeño (conteo de personas, municipios, etc.) no añade $
  return val.toLocaleString('es-CO');
}

function isMoney(bars: DashBar[]): boolean {
  // Heurística: si algún valor supera 1 millón, es monetario
  return bars.some(b => b.value >= 1_000_000);
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

  ngAfterViewInit() { this.initialized = true; this.render(); }

  ngOnChanges() {
    if (!this.initialized) return;
    this.destroy();
    this.render();
  }

  ngOnDestroy() { this.destroy(); }

  private destroy() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  }

  private async render() {
    if (!this.canvasRef?.nativeElement || !this.bars.length) return;

    const { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip } = await import('chart.js');
    Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip);

    const isVertical = this.vertical || this.bars.length <= 6;
    const money = isMoney(this.bars);

    // Truncar labels largos
    const truncate = (s: string, n = 38) => s.length > n ? s.slice(0, n - 1) + '…' : s;

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.bars.map(b => truncate(b.label, isVertical ? 20 : 40)),
        datasets: [{
          data: this.bars.map(b => b.value),
          backgroundColor: this.bars.map(b => b.color),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: isVertical ? 'x' : 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items: any[]) => {
                // Mostrar label completo en tooltip
                const idx = items[0]?.dataIndex ?? 0;
                return this.bars[idx]?.label ?? '';
              },
              label: (ctx: any) => {
                const val = ctx.raw as number;
                const bar = this.bars[ctx.dataIndex];
                if (money) {
                  return ` ${formatVal(val)}${bar?.pct !== undefined && bar.pct !== 100 ? ` · ${bar.pct}%` : ''}`;
                }
                return ` ${val.toLocaleString('es-CO')}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: !isVertical, color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { size: 11 },
              color: '#94A3B8',
              maxRotation: isVertical ? 35 : 0,
              callback: (val: any, idx: number) => {
                if (!isVertical && money) {
                  // eje X en horizontal = valores numéricos
                  return formatVal(val as number);
                }
                return val;
              }
            }
          },
          y: {
            grid: { display: isVertical, color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { size: 11 },
              color: '#94A3B8',
              callback: (val: any, idx: number) => {
                if (isVertical && money) {
                  // eje Y en vertical = valores numéricos
                  return formatVal(val as number);
                }
                // eje Y en horizontal = labels de categorías (val es el índice)
                // Chart.js pasa el índice numérico aquí, no el string
                if (!isVertical) {
                  return truncate(this.bars[idx]?.label ?? String(val), 35);
                }
                return val;
              }
            }
          }
        }
      }
    });
  }
}
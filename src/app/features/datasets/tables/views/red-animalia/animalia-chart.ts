import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

export type AnimaliaDistribution = { label: string; count: number; percent: number };

@Component({
    selector: 'app-animalia-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="chart" [attr.aria-label]="label">
            @if (mode === 'donut') {
                <div class="donut">
                    <svg viewBox="0 0 140 140" [attr.aria-label]="label">
                        @for (row of rows; track row.label; let i = $index) {
                            <circle cx="70" cy="70" r="54" pathLength="100" fill="none" stroke-width="20"
                                [attr.stroke]="colors[i % colors.length]" [attr.stroke-dasharray]="row.percent + ' ' + (100 - row.percent)"
                                [attr.stroke-dashoffset]="-offset(i)" transform="rotate(-90 70 70)"
                                role="button" tabindex="0" [attr.aria-label]="description(row)"
                                [attr.aria-pressed]="isSelected(row)"
                                (mouseenter)="hovered.set(row)" (mouseleave)="hovered.set(null)"
                                (focus)="hovered.set(row)" (blur)="hovered.set(null)"
                                (click)="choose(row)" (keydown.enter)="choose(row)" (keydown.space)="$event.preventDefault(); choose(row)">
                                <title>{{ description(row) }}</title>
                            </circle>
                        }
                    </svg>
                    <div class="center"><strong>{{ total | number }}</strong><small>miembros</small></div>
                </div>
            }
            <div [class]="mode === 'columns' ? 'columns' : mode === 'donut' ? 'legend' : 'rows'">
                @for (row of rows; track row.label; let i = $index) {
                    <button type="button" [class]="mode === 'columns' ? 'column' : 'row'"
                        [attr.aria-label]="description(row)" [attr.aria-pressed]="isSelected(row)"
                        (mouseenter)="hovered.set(row)" (mouseleave)="hovered.set(null)"
                        (focus)="hovered.set(row)" (blur)="hovered.set(null)" (click)="choose(row)">
                        @if (mode === 'columns') {
                            <span class="column-space"><span class="column-bar" [style.height.%]="row.count / (rows[0]?.count || 1) * 90"><b>{{ row.count }}</b></span></span><span class="column-label">{{ row.label }}</span>
                        } @else {
                            <span class="row-title">
                                @if (mode === 'donut') { <i [style.background]="colors[i % colors.length]"></i> }
                                @if (mode === 'rank') { <span class="rank">{{ i + 1 }}</span> }
                                <span>{{ row.label }}</span><b>{{ row.count }}</b>
                            </span>
                            @if (mode === 'bars') { <span class="track"><span [style.width.%]="row.percent" [style.background]="colors[i % colors.length]"></span></span> }
                        }
                    </button>
                }
            </div>
            <p class="hint" role="status">{{ hovered() ? description(hovered()!) : 'Selecciona una categoría para filtrar' }}</p>
        </div>
    `,
    styles: [`
        :host{display:block;min-width:0}.chart{min-width:0}button{font:inherit;color:inherit;border:0;background:transparent;cursor:pointer;text-align:left}button:hover,button[aria-pressed=true]{background:#edf6ef}button:focus-visible,circle:focus-visible{outline:2px solid #2e7d32;outline-offset:2px}circle{cursor:pointer;transition:stroke-width .15s}circle:hover,circle:focus{stroke-width:24}.donut{position:relative;width:140px;height:140px;margin:12px auto}.donut svg{width:100%;height:100%;overflow:visible}.center{position:absolute;inset:30px;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}.center strong{font-size:22px}.center small{font-size:9px;color:#64748b}.legend{max-height:104px;overflow:auto}.rows{max-height:210px;overflow:auto;margin-top:12px}.row{display:block;width:100%;padding:6px 3px;border-radius:4px;font-size:10px}.row-title{display:flex;align-items:center;gap:7px}.row-title>span:not(.rank){flex:1;overflow-wrap:anywhere}.row-title i{width:7px;height:7px;border-radius:50%;flex-shrink:0}.track{display:block;height:6px;border-radius:6px;background:#f1f5f9;margin-top:5px;overflow:hidden}.track>span{display:block;height:100%;border-radius:6px}.rank{display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#e8f5e9;color:#2e7d32;font-weight:700;flex-shrink:0}.columns{display:flex;gap:12px;height:280px;overflow-x:auto;padding:10px 8px 0}.column{width:54px;flex-shrink:0;padding:0;text-align:center;align-self:stretch}.column-space{height:205px;display:flex;align-items:flex-end;border-bottom:1px solid #e2e8f0}.column-bar{display:block;position:relative;width:32px;margin:0 auto;background:#2e7d32;border-radius:4px 4px 0 0;min-height:2px}.column-bar b{position:absolute;top:-17px;left:0;right:0;font-size:10px;color:#475569}.column-label{display:block;font-size:9px;color:#64748b;line-height:1.25;overflow-wrap:anywhere;margin-top:9px}.hint{font-size:10px;line-height:1.5;min-height:30px;color:#475569;margin:10px 0 0}
    `],
})
export class AnimaliaChartComponent {
    private chartRows: AnimaliaDistribution[] = [];
    @Input() set rows(value: AnimaliaDistribution[]) { this.chartRows = value; this.hovered.set(null); }
    get rows() { return this.chartRows; }
    @Input() label = '';
    @Input() mode: 'donut' | 'columns' | 'bars' | 'rank' = 'bars';
    @Input() selected = '';
    @Output() categorySelected = new EventEmitter<string>();
    readonly colors = ['#2E7D32', '#F9A825', '#1565C0', '#7B1FA2', '#E65100', '#0891B2', '#94A3B8'];
    hovered = signal<AnimaliaDistribution | null>(null);
    get total() { return this.rows.reduce((sum, row) => sum + row.count, 0); }
    isSelected(row: AnimaliaDistribution) { return this.selected.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es') === row.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es'); }
    offset(index: number) { return this.rows.slice(0, index).reduce((sum, row) => sum + row.percent, 0); }
    description(row: AnimaliaDistribution) { return `${row.label}: ${row.count} integrantes (${row.percent.toLocaleString('es', { maximumFractionDigits: 1 })}%). Seleccionar para filtrar.`; }
    choose(row: AnimaliaDistribution) { this.hovered.set(null); this.categorySelected.emit(row.label); }
}

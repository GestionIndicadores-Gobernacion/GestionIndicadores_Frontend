import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardBarComponent } from '../../visualizations/dashboard-bar/dashboard-bar';
import { DashboardDonutComponent } from '../../visualizations/dashboard-donut/dashboard-donut';
import { DashboardHistogramComponent } from '../../visualizations/dashboard-histogram/dashboard-histogram';
import { DashboardCompletenessComponent } from '../../visualizations/dashboard-completeness/dashboard-completeness';
import { DashboardTableComponent } from '../../visualizations/dashboard-table/dashboard-table';
import { DashboardData, DashSection, DashBar } from '../../table-viewer/table-viewer';

@Component({
    selector: 'app-generico-view',
    standalone: true,
    imports: [
        CommonModule,
        DashboardBarComponent,
        DashboardDonutComponent,
        DashboardHistogramComponent,
        DashboardCompletenessComponent,
        DashboardTableComponent,
    ],
    templateUrl: './view.html'
})
export class GenericoViewComponent {
    @Input() data!: DashboardData;

    gridClass(): string {
        const n = this.data?.sections?.length ?? 0;
        if (n <= 2) return 'grid grid-cols-1 lg:grid-cols-2 gap-5';
        if (n <= 5) return 'grid grid-cols-1 lg:grid-cols-2 gap-5';
        return 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5';
    }

    kpiGridStyle(): string {
        const n = this.data?.kpis?.length ?? 0;
        if (n <= 3) return 'grid-template-columns:repeat(auto-fit,minmax(200px,1fr));';
        if (n <= 5) return 'grid-template-columns:repeat(auto-fit,minmax(175px,1fr));';
        return 'grid-template-columns:repeat(auto-fit,minmax(150px,1fr));';
    }

    sectionSpan(section: DashSection): string {
        const n = this.data?.sections?.length ?? 0;

        if (section.span === 'full')
            return n >= 6 ? 'xl:col-span-3 lg:col-span-2' : 'lg:col-span-2';
        if (section.span === 'half') return '';

        const items = (section.bars?.length ?? 0) + (section.segments?.length ?? 0);

        if (['completeness', 'table', 'text_list', 'progress'].includes(section.type))
            return n >= 6 ? 'xl:col-span-3 lg:col-span-2' : 'lg:col-span-2';

        if (n <= 2) {
            if (n === 1) return 'lg:col-span-2';
            if (section.type === 'bar' && items >= 8) return 'lg:col-span-2';
            return '';
        }
        if (n <= 5) {
            if (section.type === 'bar' && items >= 10) return 'lg:col-span-2';
            return '';
        }
        if (section.type === 'bar' && items >= 10) return 'xl:col-span-2';
        return '';
    }

    sectionIconBg(type: string): string {
        const map: Record<string, string> = {
            bar: '#2563EB',
            histogram: '#0891B2',
            donut: '#7C3AED',
            completeness: '#059669',
            table: '#D97706',
            progress: '#1B3A6B',
        };
        return map[type] ?? '#2563EB';
    }

    /** Formatea número como pesos colombianos abreviados. */
    formatPesos(val: number): string {
        if (!val && val !== 0) return '$0';
        if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        return `$${val.toLocaleString('es-CO')}`;
    }

    /** Trunca labels largos a 45 chars para completeness/bar de rubros. */
    truncateBars(bars: DashBar[]): DashBar[] {
        return bars.map(b => ({
            ...b,
            label: b.label.length > 45 ? b.label.slice(0, 43) + '…' : b.label
        }));
    }
}
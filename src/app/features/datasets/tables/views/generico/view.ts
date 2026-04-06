import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardBarComponent } from '../../visualizations/dashboard-bar/dashboard-bar';
import { DashboardDonutComponent } from '../../visualizations/dashboard-donut/dashboard-donut';
import { DashboardHistogramComponent } from '../../visualizations/dashboard-histogram/dashboard-histogram';
import { DashboardCompletenessComponent } from '../../visualizations/dashboard-completeness/dashboard-completeness';
import { DashboardData, DashSection } from '../../table-viewer/table-viewer';

@Component({
    selector: 'app-generico-view',
    standalone: true,
    imports: [
        CommonModule,
        DashboardBarComponent,
        DashboardDonutComponent,
        DashboardHistogramComponent,
        DashboardCompletenessComponent
    ],
    templateUrl: './view.html'
})
export class GenericoViewComponent {
    @Input() data!: DashboardData;

    sectionGridClass(section: DashSection): string {
        return ['completeness', 'table', 'text_list'].includes(section.type) ? 'lg:col-span-2' : '';
    }

    sectionIconBg(type: string): string {
        const map: Record<string, string> = {
            bar: '#2563EB', histogram: '#0891B2', donut: '#7C3AED',
            completeness: '#059669', table: '#D97706',
        };
        return map[type] ?? '#2563EB';
    }
}
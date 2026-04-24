import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { DatasetService } from '../../../../features/datasets/services/datasets.service';
import { GenericoViewComponent } from '../views/generico/view';
import { PersonasCapacitadasViewComponent } from '../views/personas-capacitadas/view';
import { PresupuestalViewComponent } from '../views/presupuestal/view';
import { RedAnimaliaViewComponent } from '../views/red-animalia/view';
import { DashboardRecordsComponent } from '../visualizations/dashboard-records/dashboard-records';

export interface DashBar { label: string; value: number; pct: number; color: string; }
export interface DashSegment { label: string; value: number; pct: number; color: string; }
export type DashSectionType = 'bar' | 'histogram' | 'donut' | 'completeness' | 'table' | 'cards' | 'text_list' | 'progress' | 'grouped_rows';
export interface DashSection {
    id: string; title: string; subtitle: string; type: DashSectionType;
    bars?: DashBar[]; segments?: DashSegment[];
    columns?: string[]; rows?: any[][];
    cards?: any[]; texts?: string[];
    span?: 'full' | 'half';
    groups?: any[];
}
export interface DashKpi { label: string; value: string; sub?: string; icon?: string; }
export interface DashboardData {
    table: { id: number; name: string; description: string; dataset_id: number; };
    total: number;
    kpis: DashKpi[];
    sections: DashSection[];
    dataset_type: 'personas_capacitadas' | 'animales' | 'presupuesto' | 'generico' | 'censo_animal' | 'red_animalia';
    project_label?: string;  // ← agregar
}

@Component({
    selector: 'app-table-viewer',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        PersonasCapacitadasViewComponent,
        GenericoViewComponent,
        PresupuestalViewComponent,
        RedAnimaliaViewComponent,
        DashboardRecordsComponent,
    ],
    templateUrl: './table-viewer.html',
    styleUrls: ['./table-viewer.css']
})
export class TableViewerComponent implements OnInit {
    loading = signal(true);
    error = signal<string | null>(null);
    data = signal<DashboardData | null>(null);
    datasetName = signal<string>('');
    activeTab = signal<'dashboard' | 'records'>('dashboard');
    tableId = 0;

    private destroyRef = inject(DestroyRef);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private datasetService: DatasetService
    ) { }

    ngOnInit(): void {
        this.tableId = Number(this.route.snapshot.paramMap.get('tableId'));
        this.datasetService.getTableDashboard(this.tableId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: d => {
                    this.data.set(d);
                    this.loading.set(false);
                    this.datasetService.getById(d.table.dataset_id)
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe({
                            next: ds => this.datasetName.set(ds.name)
                        });
                },
                error: () => { this.error.set('No se pudo cargar el dashboard'); this.loading.set(false); }
            });
    }

    goBack(): void { this.router.navigate(['/datasets']); }
    setTab(tab: 'dashboard' | 'records'): void { this.activeTab.set(tab); }
}
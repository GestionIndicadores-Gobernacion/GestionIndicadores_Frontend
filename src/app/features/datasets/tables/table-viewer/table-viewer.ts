import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { DashboardBarComponent } from './visualizations/dashboard-bar/dashboard-bar';
import { DashboardCardsComponent } from './visualizations/dashboard-cards/dashboard-cards';
import { DashboardDonutComponent } from './visualizations/dashboard-donut/dashboard-donut';
import { DashboardHistogramComponent } from './visualizations/dashboard-histogram/dashboard-histogram';
import { DashboardTableComponent } from './visualizations/dashboard-table/dashboard-table';
import { DashboardTextComponent } from './visualizations/dashboard-text/dashboard-text';
import { DatasetService } from '../../../../core/services/datasets.service';




export interface DashBar {
  label: string
  value: number
  pct: number
  color: string
}



export type DashSectionType =
  'bar'
  | 'histogram'
  | 'donut'
  | 'table'
  | 'cards'
  | 'text_list'



export interface DashSection {

  id: string
  title: string
  subtitle: string
  type: DashSectionType

  bars?: DashBar[]

  segments?: any[]

  columns?: string[]
  rows?: any[]

  cards?: any[]

  texts?: string[]

}



export interface DashKpi {

  label: string
  value: string
  sub?: string
  icon?: string

}



export interface DashboardData {

  table: {
    id: number
    name: string
    description: string
    dataset_id: number
  }

  total: number

  kpis: DashKpi[]

  sections: DashSection[]

}



interface ActiveFilter {

  sectionId: string
  sectionTitle: string
  label: string

}



@Component({

  selector: 'app-table-viewer',

  standalone: true,

  imports: [
    CommonModule,
    DashboardBarComponent,
    DashboardHistogramComponent,
    DashboardDonutComponent,
    DashboardTableComponent,
    DashboardCardsComponent,
    DashboardTextComponent
  ],

  templateUrl: './table-viewer.html',

  styleUrls: ['./table-viewer.css']

})
export class TableViewerComponent implements OnInit {



  loading = signal(true)

  error = signal<string | null>(null)

  data = signal<DashboardData | null>(null)



  activeFilters = signal<ActiveFilter[]>([])

  searchQuery = signal('')
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private datasetService: DatasetService
  ) { }

  ngOnInit(): void {

    const tableId = Number(this.route.snapshot.paramMap.get('tableId'))

    this.datasetService.getTableDashboard(tableId).subscribe({

      next: d => {

        this.data.set(d)
        this.loading.set(false)

      },

      error: () => {

        this.error.set('No se pudo cargar el dashboard')
        this.loading.set(false)

      }

    })

  }



  filteredSections = computed((): DashSection[] => {

    const data = this.data()

    if (!data) return []

    const q = this.searchQuery().toLowerCase().trim()

    if (!q) return data.sections



    return data.sections.filter(s =>

      s.title.toLowerCase().includes(q) ||
      s.subtitle.toLowerCase().includes(q)

    )

  })



  filteredTotal = computed(() => {

    const data = this.data()

    if (!data) return 0

    return data.total

  })



  removeFilter(filter: ActiveFilter) {

    this.activeFilters.set(
      this.activeFilters().filter(
        f => !(f.sectionId === filter.sectionId && f.label === filter.label)
      )
    )

  }



  clearFilters() {

    this.activeFilters.set([])
    this.searchQuery.set('')

  }



  goBack() {

    this.router.navigate(['/datasets'])

  }

}
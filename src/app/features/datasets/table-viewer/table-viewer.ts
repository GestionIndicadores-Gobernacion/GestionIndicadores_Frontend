import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DatasetService } from '../../../core/services/datasets.service';

export interface DashBar {
  label: string;
  value: number;
  pct: number;
  color: string;
}

export interface NumericStats {
  min: number; max: number;
  avg: number; median: number;
  total: number; count: number;
}

export interface DashSection {
  id: string;
  title: string;
  subtitle: string;
  type: 'bar' | 'histogram' | 'completeness';
  bars: DashBar[];
  stats?: NumericStats;
  unique_count?: number;
}

export interface DashKpi {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}

export interface DashboardData {
  table: { id: number; name: string; description: string; dataset_id: number };
  total: number;
  kpis: DashKpi[];
  sections: DashSection[];
}

interface ActiveFilter {
  sectionId: string;
  sectionTitle: string;
  label: string;
}

@Component({
  selector: 'app-table-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-viewer.html',
  styleUrls: ['./table-viewer.css']
})
export class TableViewerComponent implements OnInit {

  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<DashboardData | null>(null);

  // Filtros e interactividad
  activeFilters = signal<ActiveFilter[]>([]);
  searchQuery = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private datasetService: DatasetService
  ) { }

  ngOnInit(): void {
    const tableId = Number(this.route.snapshot.paramMap.get('tableId'));
    this.datasetService.getTableDashboard(tableId).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el dashboard'); this.loading.set(false); }
    });
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  /** Secciones filtradas por búsqueda de texto */
  filteredSections = computed((): DashSection[] => {
    const data = this.data();
    if (!data) return [];
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return data.sections;
    return data.sections.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.subtitle.toLowerCase().includes(q) ||
      s.bars.some(b => b.label.toLowerCase().includes(q))
    );
  });

  /** Total aproximado de registros según filtros activos */
  filteredTotal = computed((): number => {
    const data = this.data();
    if (!data) return 0;
    const filters = this.activeFilters();
    if (filters.length === 0) return data.total;

    // Aproximación: usar el mínimo de los valores de las barras activas
    // (intersección aproximada entre filtros)
    let min = data.total;
    for (const f of filters) {
      const section = data.sections.find(s => s.id === f.sectionId);
      if (!section) continue;
      const bar = section.bars.find(b => b.label === f.label);
      if (bar) min = Math.min(min, bar.value);
    }
    return min;
  });

  // ── Filtros ─────────────────────────────────────────────────────────────────

  toggleFilter(section: DashSection, bar: DashBar): void {
    if (section.type !== 'bar') return;

    const filters = this.activeFilters();
    const existingIdx = filters.findIndex(
      f => f.sectionId === section.id && f.label === bar.label
    );

    if (existingIdx >= 0) {
      // Ya está activo → quitar
      this.activeFilters.set(filters.filter((_, i) => i !== existingIdx));
    } else {
      // Quitar otros filtros de esta misma sección y agregar el nuevo
      const withoutSection = filters.filter(f => f.sectionId !== section.id);
      this.activeFilters.set([...withoutSection, {
        sectionId: section.id,
        sectionTitle: section.title,
        label: bar.label
      }]);
    }
  }

  removeFilter(filter: ActiveFilter): void {
    this.activeFilters.set(
      this.activeFilters().filter(f => !(f.sectionId === filter.sectionId && f.label === filter.label))
    );
  }

  clearFilters(): void {
    this.activeFilters.set([]);
    this.searchQuery.set('');
  }

  /** ¿Esta barra está activa (seleccionada)? */
  isBarActive(sectionId: string, label: string): boolean {
    return this.activeFilters().some(f => f.sectionId === sectionId && f.label === label);
  }

  /** ¿Esta barra está opacada (hay un filtro en esta sección pero no es esta)? */
  isBarFiltered(sectionId: string, label: string): boolean {
    const sectionFilters = this.activeFilters().filter(f => f.sectionId === sectionId);
    if (sectionFilters.length === 0) return false;
    return !sectionFilters.some(f => f.label === label);
  }

  maxBarValue(section: DashSection): number {
    return Math.max(...section.bars.map(b => b.value), 1);
  }

  goBack(): void {
    this.router.navigate(['/datasets']);
  }
}
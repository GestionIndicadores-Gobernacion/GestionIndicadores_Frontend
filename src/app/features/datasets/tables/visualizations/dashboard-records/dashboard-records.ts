import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewerData, DatasetService } from '../../../../../features/datasets/services/datasets.service';

type SortDir = 'asc' | 'desc' | null;

// ─── Config por dataset_type ──────────────────────────────────────────────────

interface RecordsConfig {
  tableFields: string[];
  yesnoFields: string[];
  categoricalFields: string[];
  searchPlaceholder: string;
  detailTitle: string;
  detailSubtitle: string[];
}

const RECORDS_CONFIG: Record<string, RecordsConfig> = {

  personas_capacitadas: {
    tableFields: ['nombres_y_apellidos', 'documento', 'mes', 'municipio', 'telefono', 'edad'],
    yesnoFields: ['mujer', 'hombre', 'lgbtiq_', 'intersesual', 'afro', 'indigena', 'rrom', 'discapacidad', 'victima', 'reincorporado'],
    categoricalFields: ['municipio', 'mes'],
    searchPlaceholder: 'Buscar persona, documento...',
    detailTitle: 'nombres_y_apellidos',
    detailSubtitle: ['municipio', 'mes'],
  },

  animales: {
    tableFields: [
      'nombres_y_apellidos',
      // Nuevo formato (BASE DE DATOS RED ANIMALIA simple)
      'municipio',
      'telefono',
      'otro_telefono',
      'correo_electronico',
      // Formato anterior (base protectores completa)
      'municipio_de_residencia',
      'tipo_de_vinculacion_dentro_de_la_red_animalia_valle',
      'perros_cantidad',
      'gatos_cantidad',
      'telefono_celular',
      'edad',
    ],
    yesnoFields: [
      'esta_dispuesto_a_recibir_una_visita_de_la_gobernacion_del_valle_del_cauca',
      'esta_dispuesto_en_dar_en_adopcion_los_animales_que_tiene_a_cargo',
      'tienes_algun_emprendimiento',
      'tiene_alguna_fuente_de_ingreso',
      'actualmente_recibe_donaciones_de_alguna_entidad',
      'tiene_capacidad_operativa_para_apoyar_rescates_cual',
      'estaria_dispuestoa_a_recibir_en_su_espacio_fisico_a_un_animal_que_ha_sido_victima_de_violencia',
    ],
    categoricalFields: [
      'municipio',
      'municipio_de_residencia',
      'tipo_de_vinculacion_dentro_de_la_red_animalia_valle',
      'nivel_de_escolaridad',
      'sexo',
    ],
    searchPlaceholder: 'Buscar persona, municipio, fundación...',
    detailTitle: 'nombres_y_apellidos',
    detailSubtitle: ['municipio', 'municipio_de_residencia', 'tipo_de_vinculacion_dentro_de_la_red_animalia_valle'],
  },

  presupuesto: {
    tableFields: [
      // Nuevo formato (C.Gestor / Fondo / Descripcion PEP / ...)
      'descripcion_pep',
      'descripcion_proyecto',
      'cgestor',
      'fondo',
      'pres_inicial',
      'apropiacion_definitiva',
      'total_ejecutado',
      'total_obligaciones',
      'total_pagos',
      'presup_disponible',
      'ejecutado',
      // Formato anterior (compatibilidad)
      'nombre_cgestor',
      'desc_grupo',
      'cdp_ejecutado',
    ],
    yesnoFields: [],
    categoricalFields: ['fondo', 'proyecto', 'cgestor', 'desc_grupo', 'desc_subgrupo', 'desc_sector'],
    searchPlaceholder: 'Buscar rubro, proyecto, fondo...',
    detailTitle: 'descripcion_pep',
    detailSubtitle: ['fondo', 'descripcion_proyecto', 'desc_grupo'],
  },

  censo_animal: {
    tableFields: [
      'municipio',
      'poblacion_perros_2026',
      'poblacion_gatos_2026',
      'no_viviendas_encuestadas',
      'no_perros_reportados',
      'no_gatos_reportados',
      'vta',
      'pob_ajustada',
      'estimado_de_perros',
      'estimado_de_gatos',
    ],
    yesnoFields: [],
    categoricalFields: ['municipio'],
    searchPlaceholder: 'Buscar municipio...',
    detailTitle: 'municipio',
    detailSubtitle: ['poblacion_perros_2026', 'poblacion_gatos_2026'],
  },

  generico: {
    tableFields: [],
    yesnoFields: [],
    categoricalFields: [],
    searchPlaceholder: 'Buscar...',
    detailTitle: '',
    detailSubtitle: [],
  },

};

const DEFAULT_CONFIG: RecordsConfig = RECORDS_CONFIG['generico'];

// ─── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'dashboard-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-records.html'
})
export class DashboardRecordsComponent implements OnInit {
  @Input() tableId = 0;
  @Input() datasetType: string = 'generico';

  loading = signal(true);
  viewerData = signal<ViewerData | null>(null);
  searchTerm = signal('');
  activeFilters = signal<Record<string, string>>({});
  currentPage = signal(1);
  selectedRecord = signal<any | null>(null);
  sortField = signal<string | null>(null);
  sortDir = signal<SortDir>(null);

  readonly pageSize = 25;

  private get cfg(): RecordsConfig {
    return RECORDS_CONFIG[this.datasetType] ?? DEFAULT_CONFIG;
  }

  get YESNO_FIELDS(): string[]    { return this.cfg.yesnoFields; }
  get CATEGORICAL(): string[]     { return this.cfg.categoricalFields; }
  get searchPlaceholder(): string { return this.cfg.searchPlaceholder; }
  get detailTitle(): string       { return this.cfg.detailTitle; }
  get detailSubtitleFields(): string[] { return this.cfg.detailSubtitle; }

  constructor(private datasetService: DatasetService) {}

  ngOnInit(): void {
    this.datasetService.getTableViewer(this.tableId).subscribe({
      next: d => { this.viewerData.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ─── Campos ────────────────────────────────────────────────────────────────

  visibleFields = computed(() => {
    const data = this.viewerData();
    if (!data) return [];
    return data.fields.filter(f => f.name !== '_' && f.name !== 'field');
  });

  tableFields = computed(() => {
    const fields = this.visibleFields();
    const priority = this.cfg.tableFields;

    if (!priority.length) return fields.slice(0, 7);

    const fieldMap = new Map(fields.map(f => [f.name, f]));
    return priority
      .map(name => fieldMap.get(name))
      .filter((f): f is NonNullable<typeof f> => !!f);
  });

  yesnoFields = computed(() =>
    this.visibleFields().filter(f => this.YESNO_FIELDS.includes(f.name.toLowerCase()))
  );

  categoricalFields = computed(() => {
    const data = this.viewerData();
    if (!data) return [];
    return this.visibleFields()
      .filter(f => this.CATEGORICAL.includes(f.name.toLowerCase()))
      .map(f => ({
        field: f,
        options: Array.from(new Set(
          data.records
            .map(r => String(r.data[f.name] ?? '').trim())
            .filter(v => v && v !== 'nan')
        )).sort()
      }));
  });

  // ─── Filtros ───────────────────────────────────────────────────────────────

  filteredRecords = computed(() => {
    const data = this.viewerData();
    if (!data) return [];

    let rows = [...data.records];
    const q = this.searchTerm().toLowerCase().trim();
    const filters = this.activeFilters();

    if (q) {
      rows = rows.filter(r =>
        Object.values(r.data).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }

    for (const [field, val] of Object.entries(filters)) {
      if (!val) continue;
      rows = rows.filter(r => {
        const v = String(r.data[field] ?? '').toLowerCase().trim();
        return v === val.toLowerCase();
      });
    }

    const sf = this.sortField();
    const sd = this.sortDir();
    if (sf && sd) {
      rows.sort((a, b) => {
        const av = String(a.data[sf] ?? '').toLowerCase();
        const bv = String(b.data[sf] ?? '').toLowerCase();
        const n1 = parseFloat(av), n2 = parseFloat(bv);
        const cmp = !isNaN(n1) && !isNaN(n2) ? n1 - n2 : av.localeCompare(bv);
        return sd === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  });

  // ─── Paginación ────────────────────────────────────────────────────────────

  paginatedRecords = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRecords().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.max(Math.ceil(this.filteredRecords().length / this.pageSize), 1)
  );

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  // ─── Estado de filtros ─────────────────────────────────────────────────────

  hasActiveFilters = computed(() =>
    Object.keys(this.activeFilters()).length > 0 || !!this.searchTerm()
  );

  // ─── Detail header dinámico ────────────────────────────────────────────────

  detailHeader = computed(() => {
    const rec = this.selectedRecord();
    if (!rec) return { title: '—', subtitle: '—' };

    const titleField = this.detailTitle;
    const title = titleField
      ? this.getCellValue(rec, titleField)
      : this.getCellValue(rec, this.tableFields()[0]?.name ?? '');

    const subtitle = this.detailSubtitleFields
      .map(f => this.getCellValue(rec, f))
      .filter(v => v !== '—')
      .join(' · ') || '—';

    return { title, subtitle };
  });

  // ─── Acciones ──────────────────────────────────────────────────────────────

  setSort(field: string): void {
    if (this.sortField() === field) {
      const next = this.sortDir() === 'asc' ? 'desc' : this.sortDir() === 'desc' ? null : 'asc';
      this.sortDir.set(next);
      if (next === null) this.sortField.set(null);
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.currentPage.set(1);
  }

  setFilter(field: string, value: string): void {
    const current = this.activeFilters();
    if (current[field] === value) {
      const updated = { ...current };
      delete updated[field];
      this.activeFilters.set(updated);
    } else {
      this.activeFilters.set({ ...current, [field]: value });
    }
    this.currentPage.set(1);
  }

  setDropdownFilter(field: string, value: string): void {
    const current = this.activeFilters();
    if (!value) {
      const u = { ...current };
      delete u[field];
      this.activeFilters.set(u);
    } else {
      this.activeFilters.set({ ...current, [field]: value });
    }
    this.currentPage.set(1);
  }

  clearAllFilters(): void {
    this.activeFilters.set({});
    this.searchTerm.set('');
    this.sortField.set(null);
    this.sortDir.set(null);
    this.currentPage.set(1);
  }

  isFilterActive(field: string, value: string): boolean {
    return this.activeFilters()[field] === value;
  }

  selectRecord(rec: any): void {
    this.selectedRecord.set(this.selectedRecord()?.id === rec.id ? null : rec);
  }

  closeDetail(): void { this.selectedRecord.set(null); }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // ─── Helpers de celda ──────────────────────────────────────────────────────

  getCellValue(rec: any, fieldName: string): string {
    const val = rec?.data?.[fieldName];
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  }

  isYesValue(val: string): boolean {
    return ['si', 'sí', 'yes', '1', 'true'].includes(val.toLowerCase());
  }

  getInitials(rec: any): string {
    const titleField = this.detailTitle;
    const name = String(
      rec?.data?.[titleField] ??
      rec?.data?.['nombres_y_apellidos'] ??
      rec?.data?.['nombre'] ?? ''
    );
    return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';
  }

  getAvatarColor(rec: any): string {
    const colors = ['#2563EB', '#0891B2', '#059669', '#7C3AED', '#DB2777', '#D97706'];
    const titleField = this.detailTitle;
    const name = String(
      rec?.data?.[titleField] ??
      rec?.data?.['nombres_y_apellidos'] ??
      rec?.data?.['nombre'] ?? 'A'
    );
    return colors[name.charCodeAt(0) % colors.length];
  }

  detailFields = computed(() => {
    const rec = this.selectedRecord();
    if (!rec) return [];
    return this.visibleFields().map(f => ({
      label: f.label,
      name: f.name,
      value: this.getCellValue(rec, f.name),
      isYesno: this.YESNO_FIELDS.includes(f.name.toLowerCase())
    })).filter(f => f.value !== '—' || !this.YESNO_FIELDS.includes(f.name.toLowerCase()));
  });
}
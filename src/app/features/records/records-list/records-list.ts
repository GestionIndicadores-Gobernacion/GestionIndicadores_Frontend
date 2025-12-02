import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { RecordModel } from '../../../core/models/record.model';
import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { RecordsService } from '../../../core/services/records.service';
import { StrategiesService } from '../../../core/services/strategy.service';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-records-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './records-list.html',
  styleUrl: './records-list.css',
})
export class RecordsListComponent {

  // PAGINACIÓN
  currentPage = 1;
  pageSize = 10;

  // ORDENAMIENTO
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  loading = true;
  search = '';

  isViewer = false;
  user: any = null;

  records: RecordModel[] = [];
  filteredRecords: RecordModel[] = [];

  // MAPAS
  strategyMap: Record<number, string> = {};
  componentMap: Record<number, string> = {};
  indicatorMap: Record<number, string> = {};

  constructor(
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) {
    const userString = localStorage.getItem('user');
    if (userString) {
      this.user = JSON.parse(userString);
      this.isViewer = this.user.role?.name === 'Viewer';
    }
  }

  ngOnInit(): void {
    this.loadMaps();
  }

  // ================================
  // Cargar Strategy → Component → Indicators → Records
  // ================================
  loadMaps() {
    this.strategiesService.getAll().subscribe({
      next: strategies => {
        this.strategyMap = Object.fromEntries(strategies.map(s => [s.id, s.name]));

        this.componentsService.getAll().subscribe({
          next: comps => {
            this.componentMap = Object.fromEntries(comps.map(c => [c.id, c.name]));

            this.indicatorsService.getAll().subscribe({
              next: inds => {
                this.indicatorMap = Object.fromEntries(inds.map(i => [i.id, i.name]));

                this.loadRecords();
              }
            });

          }
        });
      }
    });
  }

  // ================================
  // Cargar registros
  // ================================
  loadRecords() {
    this.recordsService.getAll().subscribe({
      next: res => {
        this.records = res;
        this.filteredRecords = [...this.records];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // ================================
  // NUEVO: Obtener Municipios
  // ================================
  getMunicipios(r: RecordModel): string[] {
    return r.detalle_poblacion?.municipios
      ? Object.keys(r.detalle_poblacion.municipios)
      : [];
  }

  // ================================
  // NUEVO: Obtener nombres de indicadores
  // ================================
  getIndicatorNames(r: RecordModel): string[] {
    const nombres = new Set<string>();

    if (!r.detalle_poblacion?.municipios) return [];

    Object.values(r.detalle_poblacion.municipios).forEach((mun: any) => {
      Object.keys(mun.indicadores || {}).forEach(indName => {
        nombres.add(indName);
      });
    });

    return [...nombres].sort();
  }

  // ================================
  // FILTRO
  // ================================
  applyFilter() {
    const term = this.search.trim().toLowerCase();

    this.filteredRecords = this.records.filter(r => {

      const comp = (this.componentMap[r.component_id] || '').toLowerCase();

      const muni = this.getMunicipios(r)
        .join(', ')
        .toLowerCase();

      const indicators = this.getIndicatorNames(r)
        .join(' ')
        .toLowerCase();

      return comp.includes(term)
        || muni.includes(term)
        || indicators.includes(term);
    });

    this.currentPage = 1;
  }

  // ================================
  // ORDENAMIENTO
  // ================================
  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  get sortedRecords(): RecordModel[] {
    if (!this.sortColumn) return this.filteredRecords;

    return [...this.filteredRecords].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (this.sortColumn) {

        case 'component':
          valA = this.componentMap[a.component_id]?.toLowerCase() || '';
          valB = this.componentMap[b.component_id]?.toLowerCase() || '';
          break;

        case 'municipio':
          valA = this.getMunicipios(a).join(', ').toLowerCase();
          valB = this.getMunicipios(b).join(', ').toLowerCase();
          break;

        case 'indicator':
          valA = this.getIndicatorNames(a)[0] || '';
          valB = this.getIndicatorNames(b)[0] || '';
          break;

        case 'fecha':
          valA = new Date(a.fecha).getTime();
          valB = new Date(b.fecha).getTime();
          break;

        default:
          valA = (a as any)[this.sortColumn] ?? '';
          valB = (b as any)[this.sortColumn] ?? '';
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedRecords() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedRecords.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.sortedRecords.length / this.pageSize);
  }

  // ================================
  // ELIMINAR
  // ================================
  deleteRecord(id: number) {
    this.toast.confirm("¿Eliminar registro?", "Esta acción no se puede deshacer.")
      .then(result => {
        if (result.isConfirmed) {
          this.loading = true;
          this.recordsService.delete(id).subscribe({
            next: () => {
              this.toast.success("Registro eliminado correctamente");
              this.loadRecords();
            },
            error: () => {
              this.loading = false;
              this.toast.error("Error eliminando el registro");
            }
          });
        }
      });
  }

  // ================================
  // EXPORTAR EXCEL (ya compatible con JSON)
  // ================================
  exportToExcel() {
    const workbook = XLSX.utils.book_new();

    const registrosPorEstrategia: Record<number, RecordModel[]> = {};
    for (const r of this.records) {
      const stratId = r.strategy_id ?? 0;
      if (!registrosPorEstrategia[stratId]) registrosPorEstrategia[stratId] = [];
      registrosPorEstrategia[stratId].push(r);
    }

    Object.keys(registrosPorEstrategia).forEach(stratKey => {
      const strategyId = Number(stratKey);
      const registros = registrosPorEstrategia[strategyId];
      const nombreEstrategia = this.strategyMap[strategyId] || "Estrategia";

      let sheetRows: any[][] = [];
      let currentRow = 0;

      const registrosPorComponente: Record<number, RecordModel[]> = {};
      for (const r of registros) {
        const compId = r.component_id ?? 0;
        if (!registrosPorComponente[compId]) registrosPorComponente[compId] = [];
        registrosPorComponente[compId].push(r);
      }

      Object.keys(registrosPorComponente).forEach(compKey => {
        const compId = Number(compKey);
        const registrosComp = registrosPorComponente[compId];
        const nombreComponente = this.componentMap[compId] || "Componente";

        sheetRows[currentRow] = [];
        sheetRows[currentRow][0] = `Componente: ${nombreComponente}`;
        currentRow++;

        const headersBase = [
          "Municipio",
          "Fecha",
          "Evidencia",
        ];

        const indicadorNombresSet = new Set<string>();

        registrosComp.forEach(r => {
          const municipios = r.detalle_poblacion?.municipios || {};
          Object.values(municipios).forEach((mun: any) => {
            Object.keys(mun.indicadores || {}).forEach(indName => {
              indicadorNombresSet.add(indName);
            });
          });
        });

        const sortedIndicatorNames = [...indicadorNombresSet].sort();
        const headers = [...headersBase, ...sortedIndicatorNames];
        sheetRows[currentRow++] = headers;

        registrosComp.forEach(r => {
          const municipios = r.detalle_poblacion?.municipios || {};

          Object.keys(municipios).forEach(nombreMuni => {
            const detMuni = municipios[nombreMuni];

            const fila = [
              nombreMuni,
              r.fecha,
              r.evidencia_url ?? "—",
            ];

            for (const indName of sortedIndicatorNames) {
              fila.push(String(detMuni.indicadores[indName] ?? "—"));
            }

            sheetRows[currentRow++] = fila;
          });
        });

        sheetRows[currentRow++] = [];
      });

      const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

      const maxCols = Math.max(...sheetRows.map(r => r.length));
      worksheet["!cols"] = Array.from({ length: maxCols }).map((_, i) => ({
        wch: Math.max(...sheetRows.map(r => (r[i] ? r[i].toString().length : 10))) + 2
      }));

      sheetRows.forEach((row, index) => {
        if (row[0]?.toString().startsWith("Componente: ")) {
          worksheet["!merges"] = worksheet["!merges"] || [];
          worksheet["!merges"].push({
            s: { r: index, c: 0 },
            e: { r: index, c: maxCols - 1 }
          });
        }
      });

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        nombreEstrategia.slice(0, 31)
      );
    });

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    saveAs(
      new Blob([excelBuffer]),
      `registros_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

}

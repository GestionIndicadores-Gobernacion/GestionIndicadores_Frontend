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
  sortColumn: keyof RecordModel | 'component' | 'indicator' | '' = '';
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

  // 1️⃣ Cargar Strategy → Component → Indicator → Records
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

  // 2️⃣ Cargar registros y normalizar el tipo_poblacion
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

  // 3️⃣ Filtro básico
  applyFilter() {
    const term = this.search.toLowerCase().trim();

    this.filteredRecords = this.records.filter(r => {
      const comp = (this.componentMap[r.component_id ?? 0] || '').toLowerCase();
      const muni = r.municipio.toLowerCase();
      const indicadoresTexto = this.getIndicatorIds(r)
        .map(id => (this.indicatorMap[id] || '').toLowerCase())
        .join(' ');

      return comp.includes(term) || muni.includes(term) || indicadoresTexto.includes(term);
    });
  }


  // 4️⃣ Ordenamiento
  get sortedRecords(): RecordModel[] {
    if (!this.sortColumn) return this.filteredRecords;

    return [...this.filteredRecords].sort((a: any, b: any) => {

      let valA: any = '';
      let valB: any = '';

      if (this.sortColumn === 'component') {
        valA = (this.componentMap[a.component_id ?? 0] || '').toLowerCase();
        valB = (this.componentMap[b.component_id ?? 0] || '').toLowerCase();
      }
      else if (this.sortColumn === 'indicator') {
        const indA = this.getIndicatorIds(a)
          .map(id => (this.indicatorMap[id] || ''))
          .sort()[0] || '';
        const indB = this.getIndicatorIds(b)
          .map(id => (this.indicatorMap[id] || ''))
          .sort()[0] || '';

        valA = indA.toLowerCase();
        valB = indB.toLowerCase();
      }

      else if (this.sortColumn === 'fecha') {
        valA = new Date(a.fecha).getTime();
        valB = new Date(b.fecha).getTime();
      }
      else {
        valA = (a[this.sortColumn] ?? '').toString().toLowerCase();
        valB = (b[this.sortColumn] ?? '').toString().toLowerCase();
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

  sortBy(column: any) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  deleteRecord(id: number) {
    this.toast
      .confirm(
        "¿Eliminar registro?",
        "Esta acción no se puede deshacer."
      )
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


  getIndicatorIds(record: RecordModel): number[] {
    return Object.keys(record.detalle_poblacion || {}).map(id => Number(id));
  }

  // Exportar excel
  exportToExcel() {
    const workbook = XLSX.utils.book_new();

    // Agrupar registros por estrategia
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

      // Agrupar por componente
      const registrosPorComponente: Record<number, RecordModel[]> = {};
      for (const r of registros) {
        const compId = r.component_id ?? 0;
        if (!registrosPorComponente[compId]) registrosPorComponente[compId] = [];
        registrosPorComponente[compId].push(r);
      }

      // Construir sección por componente
      Object.keys(registrosPorComponente).forEach(compKey => {
        const compId = Number(compKey);
        const registrosComp = registrosPorComponente[compId];
        const nombreComponente = this.componentMap[compId] || "Componente";

        // Título fusionado
        sheetRows[currentRow] = [];
        sheetRows[currentRow][0] = `Componente: ${nombreComponente}`;
        currentRow++;

        // ==== NUEVOS HEADERS SIN ESTRATEGIA NI COMPONENTE ====
        const headersBase = [
          "Municipio",
          "Fecha",
          "Fecha registro",
          "Evidencia",
        ];

        // Indicadores del componente
        const indicatorIds = new Set<number>();
        registrosComp.forEach(r => {
          Object.keys(r.detalle_poblacion || {}).forEach(id => {
            indicatorIds.add(Number(id));
          });
        });

        const sortedIndicators = [...indicatorIds]
          .map(id => this.indicatorMap[id] || `Indicador ${id}`)
          .sort();

        const headers = [...headersBase, ...sortedIndicators];

        sheetRows[currentRow++] = headers;

        // Filas de datos SIN ESTRATEGIA NI COMPONENTE
        registrosComp.forEach(r => {
          const fila = [
            r.municipio,
            r.fecha,
            r.evidencia_url ?? "—",
            r.fecha_registro ?? "—",
          ];

          for (const indName of sortedIndicators) {
            const id = Object.keys(this.indicatorMap)
              .find(k => this.indicatorMap[Number(k)] === indName);
            fila.push(id ? String(r.detalle_poblacion?.[Number(id)] ?? "—") : "—");
          }

          sheetRows[currentRow++] = fila;
        });

        sheetRows[currentRow++] = [];
      });

      const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

      const maxCols = Math.max(...sheetRows.map(r => r.length));
      worksheet["!cols"] = Array.from({ length: maxCols }).map((_, i) => ({
        wch: Math.max(
          ...sheetRows.map(r => (r[i] ? r[i].toString().length : 10))
        ) + 2
      }));

      // Fusionar títulos
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

    saveAs(new Blob([excelBuffer]), `r1egistros-estrategias_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

}

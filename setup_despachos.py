import sys
from pathlib import Path

# 1. Localizar directorio frontend
candidates = [
    Path.cwd(),
    Path.cwd() / "frontend",
    Path.cwd() / "GestionIndicadores_Frontend",
    Path("C:/Users/ramon/Documents/pagina/frontend"),
    Path("C:/Users/ramon/Documents/pagina/GestionIndicadores_Frontend")
]

FRONTEND_DIR = next((c for c in candidates if (c / "src" / "app").exists()), None)
if not FRONTEND_DIR:
    print("❌ No se encontró la carpeta del frontend.")
    sys.exit(1)

despachos_dir = FRONTEND_DIR / "src" / "app" / "features" / "sismo" / "pages" / "despachos"
despachos_dir.mkdir(parents=True, exist_ok=True)
service_file = FRONTEND_DIR / "src" / "app" / "core" / "services" / "sismo.service.ts"

# 2. Asegurar métodos auxiliares en sismo.service.ts (getUrlFoto y alias getDetalleActa)
if service_file.exists():
    srv_code = service_file.read_text(encoding="utf-8")
    modificado = False
    
    if "getUrlFoto" not in srv_code:
        idx = srv_code.rfind("}")
        metodo_foto = """
  getUrlFoto(ruta: string): string {
    if (!ruta) return '';
    if (ruta.startsWith('http')) return ruta;
    const clean = ruta.replace(/^(\\/|\\\\)+/, '');
    return `http://localhost:5001/foto/${clean}`;
  }
"""
        srv_code = srv_code[:idx] + metodo_foto + srv_code[idx:]
        modificado = True

    if "getDetalleActa" not in srv_code and "getActaDetalle" in srv_code:
        idx = srv_code.rfind("}")
        metodo_alias = """
  getDetalleActa(idDoc: string): Observable<any> {
    return this.getActaDetalle(idDoc);
  }
"""
        srv_code = srv_code[:idx] + metodo_alias + srv_code[idx:]
        modificado = True

    if modificado:
        service_file.write_text(srv_code, encoding="utf-8")
        print("✅ sismo.service.ts actualizado con getUrlFoto y alias de detalle.")

# 3. Componente TypeScript (despachos.component.ts)
ts_code = """import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SismoService } from '../../../../core/services/sismo.service';

@Component({
  selector: 'app-sismo-despachos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './despachos.component.html',
  styleUrls: ['./despachos.component.scss']
})
export class DespachosComponent implements OnInit {
  private sismoService = inject(SismoService);

  filtros = {
    autoriza: '',
    recibe: '',
    municipio: '',
    fecha_desde: '',
    fecha_hasta: ''
  };

  kpis: { [key: string]: any } = {};
  kpiKeys: string[] = [];
  resultados: any[] = [];
  loading = false;
  actasCoincidentes = 0;

  detallesCargados: { [idDoc: string]: any } = {};
  filaAbierta: string | null = null;
  loadingDetalle: string | null = null;

  modalFotoVisible = false;
  modalFotoUrl = '';
  modalFotoTitulo = '';

  private debounceTimer: any;

  ngOnInit(): void {
    this.aplicarFiltros();
  }

  onFiltroChange(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.aplicarFiltros();
    }, 250);
  }

  aplicarFiltros(): void {
    this.loading = true;
    this.sismoService.filtrarDespachos(this.filtros).subscribe({
      next: (data: any) => {
        this.kpis = data?.kpis || {};
        this.kpiKeys = Object.keys(this.kpis);
        this.resultados = data?.resultados || [];
        this.actasCoincidentes = this.resultados.length;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al filtrar despachos:', err);
        this.loading = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      autoriza: '',
      recibe: '',
      municipio: '',
      fecha_desde: '',
      fecha_hasta: ''
    };
    this.aplicarFiltros();
  }

  toggleDetalle(idDoc: string): void {
    if (this.filaAbierta === idDoc) {
      this.filaAbierta = null;
      return;
    }

    this.filaAbierta = idDoc;
    if (!this.detallesCargados[idDoc]) {
      this.loadingDetalle = idDoc;
      this.sismoService.getActaDetalle(idDoc).subscribe({
        next: (res: any) => {
          this.detallesCargados[idDoc] = res;
          this.loadingDetalle = null;
        },
        error: (err: any) => {
          console.error('Error al cargar detalle acta:', err);
          this.loadingDetalle = null;
        }
      });
    }
  }

  parseOtrosArticulos(jsonStr: string): any[] {
    try {
      return JSON.parse(jsonStr || '[]');
    } catch {
      return [];
    }
  }

  abrirModalFoto(archivoImagen: string, titulo: string): void {
    this.modalFotoUrl = (this.sismoService as any).getUrlFoto
      ? (this.sismoService as any).getUrlFoto(archivoImagen)
      : `http://localhost:5001/foto/${archivoImagen}`;
    this.modalFotoTitulo = titulo;
    this.modalFotoVisible = true;
  }

  cerrarModalFoto(): void {
    this.modalFotoVisible = false;
    this.modalFotoUrl = '';
  }

  esKpiResaltado(clave: string): boolean {
    const k = (clave || '').toLowerCase();
    return k.includes('total') || k.includes('actas') || k.includes('perro') || k.includes('gato');
  }

  exportarCSV(): void {
    if (!this.resultados || this.resultados.length === 0) {
      alert('No hay registros coincidentes para exportar.');
      return;
    }

    const headers = [
      'ID Documento',
      'Codigo Vinculante',
      'Fecha Lote',
      'Municipio',
      'Barrio/Refugio',
      'Autoriza',
      'Recibe',
      'Cedula Receptor',
      'Alimento Perro (Kg)',
      'Alimento Gato (Kg)',
      'Total Seco (Kg)',
      'Humeda Perro (Und)',
      'Humeda Gato (Und)',
      'Arena (Kg)',
      'Huacales',
      'Areneros',
      'Comederos',
      'Collares',
      'Camas',
      'Cobijas'
    ];

    const rows = this.resultados.map((r: any) => [
      r.id_documento || '',
      r.codigo_acta_vinculante || '',
      r.fecha_lote || '',
      `"${(r.municipio || '').replace(/"/g, '""')}"`,
      `"${(r.barrio_corregimiento_refugio || '').replace(/"/g, '""')}"`,
      `"${(r.autoriza_nombre || '').replace(/"/g, '""')}"`,
      `"${(r.recibe_nombre || '').replace(/"/g, '""')}"`,
      r.recibe_cedula || '',
      r.alimento_perro_kg || 0,
      r.alimento_gato_kg || 0,
      r.total_alimento_seco_kg || 0,
      r.comida_humeda_perro_und || 0,
      r.comida_humeda_gato_und || 0,
      r.arena_kg || 0,
      r.huacales_und || 0,
      r.areneros_und || 0,
      r.recipientes_und || 0,
      r.collares_und || 0,
      r.camas_und || 0,
      r.cobijas_und || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `despachos_sismo_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
"""
(despachos_dir / "despachos.component.ts").write_text(ts_code, encoding="utf-8")

# 4. Plantilla HTML (despachos.component.html) con alto contraste y sin saltos en cifras
html_code = """<div class="space-y-6 pb-6">

  <!-- ENCABEZADO INSTITUCIONAL -->
  <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
    <div class="flex items-center gap-3.5">
      <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-xl shadow-xs">
        🚚
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-bold text-slate-900 tracking-tight">
            Módulo de Despachos y Multimétrica
          </h1>
          <span class="px-2.5 py-0.5 text-[11px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md">
            ENTREGA OPERATIVA
          </span>
        </div>
        <p class="text-xs text-slate-600 mt-0.5 font-medium">
          Filtrado cruzado en tiempo real, trazabilidad de remisiones y balance discriminado de suministros
        </p>
      </div>
    </div>
    
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="whitespace-nowrap">{{ actasCoincidentes }} Actas Coincidentes</span>
      </div>
      <button (click)="exportarCSV()" 
              class="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 border border-emerald-700 cursor-pointer">
        <span>📥</span>
        <span class="whitespace-nowrap">Exportar CSV</span>
      </button>
    </div>
  </div>

  <!-- CAJA DE FILTROS CRUZADOS (BORDES DEFINIDOS) -->
  <section class="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">
    <div class="flex items-center justify-between border-b border-slate-200 pb-3">
      <div class="flex items-center gap-2">
        <span class="text-base">🎛️</span>
        <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Filtros Cruzados de Operación
        </h2>
      </div>
      <button (click)="limpiarFiltros()" 
              class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer">
        Limpiar Filtros
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Autoriza Entrega</label>
        <input type="text" [(ngModel)]="filtros.autoriza" (ngModelChange)="onFiltroChange()" placeholder="Ej: Diego Calero..."
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Recibe / Albergue</label>
        <input type="text" [(ngModel)]="filtros.recibe" (ngModelChange)="onFiltroChange()" placeholder="Ej: Brenda Serrano..."
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Municipio Sede</label>
        <input type="text" [(ngModel)]="filtros.municipio" (ngModelChange)="onFiltroChange()" placeholder="Ej: Cali, Tuluá..."
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Fecha Desde</label>
        <input type="date" [(ngModel)]="filtros.fecha_desde" (ngModelChange)="onFiltroChange()"
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Fecha Hasta</label>
        <input type="date" [(ngModel)]="filtros.fecha_hasta" (ngModelChange)="onFiltroChange()"
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
    </div>
  </section>

  <!-- MÉTRICAS DINÁMICAS (KPIS) SIN SALTOS DE LÍNEA -->
  <section class="space-y-3">
    <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
      Métricas Dinámicas Calculadas en Tiempo Real
    </h3>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div *ngFor="let k of kpiKeys" 
           [ngClass]="esKpiResaltado(k) 
             ? 'bg-emerald-50/90 border-2 border-emerald-300 shadow-xs' 
             : 'bg-white border-2 border-slate-200 shadow-2xs'"
           class="p-3.5 rounded-2xl flex flex-col justify-between transition">
        <p class="text-[11px] font-bold truncate uppercase tracking-tight" 
           [ngClass]="esKpiResaltado(k) ? 'text-emerald-800' : 'text-slate-500'">
          {{ k }}
        </p>
        <h4 class="text-base font-extrabold mt-1 tracking-tight whitespace-nowrap" 
            [ngClass]="esKpiResaltado(k) ? 'text-emerald-800' : 'text-slate-900'">
          {{ kpis[k] }}
        </h4>
      </div>
    </div>
  </section>

  <!-- TABLA DE ACTAS Y COMPROBANTES -->
  <section class="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">
    <div class="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-base">📋</span>
        <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Registro Detallado de Actas Coincidentes
        </h2>
      </div>
      <span class="text-xs text-slate-500 font-medium italic">
        Haz clic en cualquier fila para desplegar el inventario entregado
      </span>
    </div>

    <div class="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar rounded-xl border border-slate-300">
      <table class="w-full text-left text-xs text-slate-700">
        <thead class="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] sticky top-0 z-10 border-b border-slate-300">
          <tr>
            <th class="p-3.5">Acta / ID</th>
            <th class="p-3.5">Fecha</th>
            <th class="p-3.5">Municipio / Refugio</th>
            <th class="p-3.5">Autoriza / Recibe</th>
            <th class="p-3.5 text-right whitespace-nowrap">Perro (Kg)</th>
            <th class="p-3.5 text-right whitespace-nowrap">Gato (Kg)</th>
            <th class="p-3.5 text-right whitespace-nowrap">Total Seco</th>
            <th class="p-3.5 text-center">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          <tr *ngIf="resultados.length === 0 && !loading">
            <td colspan="8" class="p-8 text-center text-slate-400 font-medium italic">
              No se encontraron actas con los filtros especificados.
            </td>
          </tr>

          <ng-container *ngFor="let row of resultados">
            <!-- FILA MAESTRA -->
            <tr (click)="toggleDetalle(row.id_documento)" 
                class="hover:bg-emerald-50/20 transition cursor-pointer">
              <td class="p-3.5 font-mono font-bold text-sky-800">
                <span class="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-300 font-bold whitespace-nowrap shadow-2xs">
                  {{ row.id_documento }}
                </span>
              </td>
              <td class="p-3.5 text-slate-600 whitespace-nowrap font-medium">{{ row.fecha_lote || 'N/A' }}</td>
              <td class="p-3.5 font-semibold text-slate-900">
                {{ row.municipio }}
                <span *ngIf="row.barrio_corregimiento_refugio" class="text-slate-500 block text-[10px] font-normal">
                  ↳ {{ row.barrio_corregimiento_refugio }}
                </span>
              </td>
              <td class="p-3.5">
                <div class="text-slate-900">Recibe: <b>{{ row.recibe_nombre || 'N/A' }}</b></div>
                <div class="text-[10px] text-slate-500">Autoriza: {{ row.autoriza_nombre || 'N/A' }}</div>
              </td>
              <td class="p-3.5 text-right font-bold text-emerald-800 whitespace-nowrap">{{ (row.alimento_perro_kg || 0) | number }} Kg</td>
              <td class="p-3.5 text-right font-bold text-teal-800 whitespace-nowrap">{{ (row.alimento_gato_kg || 0) | number }} Kg</td>
              <td class="p-3.5 text-right font-extrabold text-amber-800 font-mono whitespace-nowrap">{{ (row.total_alimento_seco_kg || 0) | number }} Kg</td>
              <td class="p-3.5 text-center whitespace-nowrap">
                <button (click)="$event.stopPropagation(); abrirModalFoto(row.archivo_imagen, 'Acta: ' + row.id_documento)"
                        class="px-2.5 py-1 text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg transition inline-flex items-center gap-1 shadow-2xs cursor-pointer">
                  <span>🖼️</span> Ver Acta
                </button>
              </td>
            </tr>

            <!-- ACORDEÓN EXPANDIBLE DE SUMINISTROS -->
            <tr *ngIf="filaAbierta === row.id_documento" class="bg-slate-50/90">
              <td colspan="8" class="p-4 border-l-4 border-emerald-600 border-b border-slate-200">
                
                <div *ngIf="loadingDetalle === row.id_documento" class="text-xs text-slate-500 py-3 text-center font-medium animate-pulse">
                  Cargando desglose de suministros del acta...
                </div>

                <div *ngIf="detallesCargados[row.id_documento] as det" class="space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <h5 class="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>📦</span> Resumen Detallado de Suministros Entregados (Acta: {{ det.alimento.id_documento }})
                    </h5>
                    <span class="text-[11px] text-slate-600 font-mono">
                      C.C. Receptor: <b>{{ det.alimento.recibe_cedula || 'No registrada' }}</b>
                    </span>
                  </div>

                  <!-- REJILLA DE PRODUCTOS COMPLEMENTARIOS (8 CAJAS DE ALTO CONTRASTE) -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
                    <div class="bg-white p-2.5 rounded-xl border border-slate-300 text-center shadow-2xs min-w-0">
                      <span class="text-[10px] text-slate-500 font-bold block uppercase truncate">Húmeda Perro</span>
                      <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento.comida_humeda_perro_und }} Und</b>
                    </div>
                    <div class="bg-white p-2.5 rounded-xl border border-slate-300 text-center shadow-2xs min-w-0">
                      <span class="text-[10px] text-slate-500 font-bold block uppercase truncate">Húmeda Gato</span>
                      <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento.comida_humeda_gato_und }} Und</b>
                    </div>
                    <div class="bg-white p-2.5 rounded-xl border border-slate-300 text-center shadow-2xs min-w-0">
                      <span class="text-[10px] text-slate-500 font-bold block uppercase truncate">Arena</span>
                      <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento.arena_kg }} Kg</b>
                    </div>
                    <div class="bg-white p-2.5 rounded-xl border border-slate-300 text-center shadow-2xs min-w-0">
                      <span class="text-[10px] text-slate-500 font-bold block uppercase truncate">Huacales</span>
                      <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento.huacales_und }} Und</b>
                    </div>
                    <div class="bg-white p-2.5 rounded-xl border border-slate-300 text-center shadow-2xs min-w-0">
                      <span class="text-[10px] text-slate-500 font-bold block uppercase truncate">Areneros</span>
                      <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento.areneros_und }} Und</b>
                    </div>
                    <div class="bg-white p-2.5 rounded-xl border border-slate-300 text-center shadow-2xs min-w-0">
                      <span class="text-[10px] text-slate-500 font-bold block uppercase truncate">Comederos</span>
                      <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento.recipientes_und }} Und</b>
                    </div>
                    <div class="bg-white p-2.5 rounded-xl border border-slate-300 text-center shadow-2xs min-w-0">
                      <span class="text-[10px] text-slate-500 font-bold block uppercase truncate">Camas/Cobijas</span>
                      <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento.camas_und }}/{{ det.alimento.cobijas_und }}</b>
                    </div>
                    <div class="bg-white p-2.5 rounded-xl border border-slate-300 text-center shadow-2xs min-w-0">
                      <span class="text-[10px] text-slate-500 font-bold block uppercase truncate">Collares</span>
                      <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento.collares_und }} Und</b>
                    </div>
                  </div>

                  <!-- OTROS ARTÍCULOS ANOTADOS -->
                  <div *ngIf="parseOtrosArticulos(det.alimento.otros_articulos_json).length > 0" 
                       class="p-3 bg-white rounded-xl text-xs text-slate-800 border border-slate-300 shadow-2xs">
                    <b class="text-slate-900 font-bold">Otros Artículos Anotados:</b>
                    <span *ngFor="let item of parseOtrosArticulos(det.alimento.otros_articulos_json); let last = last">
                      {{ item.cantidad }} {{ item.unidad }} {{ item.articulo }}{{ last ? '' : ', ' }}
                    </span>
                  </div>

                  <div class="text-[11px] text-slate-600 font-mono pt-1">
                    Sede Oficial: <b>{{ det.alimento.municipio }}</b> 
                    <span *ngIf="det.alimento.barrio_corregimiento_refugio">({{ det.alimento.barrio_corregimiento_refugio }})</span>
                    &nbsp;|&nbsp; Enlace Vinculante: <b>{{ det.alimento.codigo_acta_vinculante }}</b>
                  </div>
                </div>

              </td>
            </tr>
          </ng-container>
        </tbody>
      </table>
    </div>
  </section>

  <!-- MODAL VISOR HD DE ACTAS -->
  <div *ngIf="modalFotoVisible" 
       class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white border border-slate-300 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
      <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide">
          {{ modalFotoTitulo }}
        </h4>
        <button (click)="cerrarModalFoto()" 
                class="text-slate-400 hover:text-slate-700 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-sm font-bold transition cursor-pointer">
          ✕
        </button>
      </div>
      <div class="p-3 flex-1 overflow-auto flex items-center justify-center bg-slate-100">
        <img [src]="modalFotoUrl" alt="Acta Escaneada" class="max-h-[80vh] w-auto object-contain rounded shadow-md">
      </div>
    </div>
  </div>

</div>
"""
(despachos_dir / "despachos.component.html").write_text(html_code, encoding="utf-8")

# 5. Estilos SCSS (despachos.component.scss)
scss_code = """:host {
  display: block;
  width: 100%;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #10b981;
}
"""
(despachos_dir / "despachos.component.scss").write_text(scss_code, encoding="utf-8")

print(f"✅ Módulo Despachos generado exitosamente en: {despachos_dir}")

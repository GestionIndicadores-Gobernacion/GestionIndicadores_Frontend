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

buscador_dir = FRONTEND_DIR / "src" / "app" / "features" / "sismo" / "pages" / "buscador"
buscador_dir.mkdir(parents=True, exist_ok=True)
service_file = FRONTEND_DIR / "src" / "app" / "core" / "services" / "sismo.service.ts"

# 2. Asegurar que sismo.service.ts tenga todos los métodos requeridos
if service_file.exists():
    srv_code = service_file.read_text(encoding="utf-8")
    modificado = False

    if "buscarActas" not in srv_code:
        idx = srv_code.rfind("}")
        m_buscar = """
  buscarActas(q: string = '', desde: string = '', hasta: string = ''): Observable<any> {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (desde) p.set('fecha_desde', desde);
    if (hasta) p.set('fecha_hasta', hasta);
    return this.http.get(`${this.baseUrl}/actas/buscar?${p.toString()}`);
  }
"""
        srv_code = srv_code[:idx] + m_buscar + srv_code[idx:]
        modificado = True

    if "getUrlFoto" not in srv_code:
        idx = srv_code.rfind("}")
        m_foto = """
  getUrlFoto(ruta: string): string {
    if (!ruta) return '';
    if (ruta.startsWith('http')) return ruta;
    const clean = ruta.replace(/^(\\/|\\\\)+/, '');
    return `http://localhost:5001/foto/${clean}`;
  }
"""
        srv_code = srv_code[:idx] + m_foto + srv_code[idx:]
        modificado = True

    if "getDetalleActa" not in srv_code and "getActaDetalle" in srv_code:
        idx = srv_code.rfind("}")
        m_alias = """
  getDetalleActa(idDoc: string): Observable<any> {
    return this.getActaDetalle(idDoc);
  }
"""
        srv_code = srv_code[:idx] + m_alias + srv_code[idx:]
        modificado = True

    if modificado:
        service_file.write_text(srv_code, encoding="utf-8")
        print("✅ sismo.service.ts actualizado con métodos para el buscador.")

# 3. Componente TypeScript (buscador.component.ts)
ts_code = """import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SismoService } from '../../../../core/services/sismo.service';

@Component({
  selector: 'app-sismo-buscador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './buscador.component.html',
  styleUrls: ['./buscador.component.scss']
})
export class BuscadorComponent implements OnInit {
  public sismoService = inject(SismoService);

  q = '';
  fechaDesde = '';
  fechaHasta = '';

  actas: any[] = [];
  loading = false;

  detallesCargados: { [idDoc: string]: any } = {};
  loadingDetalle: { [idDoc: string]: boolean } = {};
  actasAbiertas: { [idDoc: string]: boolean } = {};

  modalFotoVisible = false;
  modalFotoUrl = '';
  modalFotoTitulo = '';

  private debounceTimer: any;

  ngOnInit(): void {
    this.buscar();
  }

  onSearchChange(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.buscar();
    }, 250);
  }

  buscar(): void {
    this.loading = true;
    this.sismoService.buscarActas(this.q, this.fechaDesde, this.fechaHasta).subscribe({
      next: (data: any) => {
        this.actas = data || [];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al buscar actas:', err);
        this.loading = false;
      }
    });
  }

  limpiarFiltros(): void {
    this.q = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.buscar();
  }

  toggleDossier(idDoc: string): void {
    this.actasAbiertas[idDoc] = !this.actasAbiertas[idDoc];

    if (this.actasAbiertas[idDoc] && !this.detallesCargados[idDoc]) {
      this.loadingDetalle[idDoc] = true;
      this.sismoService.getActaDetalle(idDoc).subscribe({
        next: (data: any) => {
          this.detallesCargados[idDoc] = data;
          this.loadingDetalle[idDoc] = false;
        },
        error: (err: any) => {
          console.error('Error al cargar detalle del acta:', err);
          this.loadingDetalle[idDoc] = false;
        }
      });
    }
  }

  getCategoriasFarmacos(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
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
}
"""
(buscador_dir / "buscador.component.ts").write_text(ts_code, encoding="utf-8")

# 4. Plantilla HTML (buscador.component.html) con alto contraste institucional
html_code = """<div class="space-y-6 pb-6">

  <!-- ENCABEZADO INSTITUCIONAL -->
  <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
    <div class="flex items-center gap-3.5">
      <div class="w-11 h-11 rounded-xl bg-sky-50 text-sky-800 border border-sky-300 flex items-center justify-center font-bold text-xl shadow-xs">
        🔍
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-bold text-slate-900 tracking-tight">
            Trazabilidad Forense de Actas y Fotos
          </h1>
          <span class="px-2.5 py-0.5 text-[11px] font-bold font-mono bg-sky-100 text-sky-800 border border-sky-300 rounded-md">
            AUDITORÍA DOCUMENTAL
          </span>
        </div>
        <p class="text-xs text-slate-600 mt-0.5 font-medium">
          Inspección forense de firmas, cédulas, insumos veterinarios vinculados y evidencias originales escaneadas
        </p>
      </div>
    </div>
    
    <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sky-50 text-sky-900 border border-sky-300 text-xs font-bold font-mono shadow-2xs">
      <span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
      <span class="whitespace-nowrap">{{ actas.length }} Actas Auditadas</span>
    </div>
  </div>

  <!-- CAJA DE BÚSQUEDA UNIVERSAL (ALTO CONTRASTE) -->
  <section class="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">
    <div class="flex items-center justify-between border-b border-slate-200 pb-3">
      <div class="flex items-center gap-2">
        <span class="text-base">🔎</span>
        <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Buscador Forense Universal con Filtro Temporal
        </h2>
      </div>
      <button (click)="limpiarFiltros()" 
              class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer">
        Limpiar Filtros
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Texto de Búsqueda</label>
        <input type="text" [(ngModel)]="q" (ngModelChange)="onSearchChange()" 
               placeholder="ID acta, cédula, receptor, refugio, autorizador..."
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Fecha Desde</label>
        <input type="date" [(ngModel)]="fechaDesde" (ngModelChange)="onSearchChange()"
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Fecha Hasta</label>
        <input type="date" [(ngModel)]="fechaHasta" (ngModelChange)="onSearchChange()"
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
    </div>
  </section>

  <!-- DOSSIER DOCUMENTAL DE ACTAS -->
  <section class="space-y-3.5">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
        Dossier Documental de Entregas ({{ actas.length }} Registros)
      </h3>
    </div>

    <div *ngIf="actas.length === 0 && !loading" 
         class="bg-white border border-slate-300 p-10 text-center text-slate-500 font-medium italic rounded-2xl shadow-sm">
      No se encontraron actas con esos filtros temporales y de texto.
    </div>

    <div class="space-y-3">
      <div *ngFor="let a of actas" 
           class="bg-white border-2 border-slate-200 hover:border-sky-400 rounded-2xl overflow-hidden transition shadow-xs">
        
        <!-- CABECERA DEL ACTA (CLICK PARA ABRIR) -->
        <div (click)="toggleDossier(a.id_documento)" 
             class="p-4 hover:bg-slate-50/80 cursor-pointer flex flex-wrap items-center justify-between gap-3 transition">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1.5 text-xs font-mono font-bold bg-sky-50 text-sky-800 border border-sky-300 rounded-xl shadow-2xs">
              {{ a.id_documento }}
            </span>
            <div>
              <h4 class="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Recibe: <b>{{ a.recibe_nombre || 'N/A' }}</b></span>
                <span *ngIf="a.recibe_cedula" class="text-[10px] font-mono text-slate-500 font-medium">
                  (CC: {{ a.recibe_cedula }})
                </span>
              </h4>
              <p class="text-[11px] text-slate-600 mt-0.5">
                📍 <b>{{ a.municipio }}</b>
                <span *ngIf="a.barrio_corregimiento_refugio">↳ {{ a.barrio_corregimiento_refugio }}</span>
                &nbsp;|&nbsp; 📅 {{ a.fecha_lote || 'N/A' }}
              </p>
            </div>
          </div>

          <!-- MÉTRICAS EN LÍNEA SIN SALTOS DE TEXTO -->
          <div class="flex items-center gap-3 text-xs font-mono whitespace-nowrap">
            <span *ngIf="a.num_meds > 0" 
                  class="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-300 rounded-lg text-[10px] font-bold flex items-center gap-1 font-sans shadow-2xs">
              <span>💊</span> {{ a.num_meds }} Fármacos
            </span>
            <span class="text-emerald-800 font-bold font-sans">🐕 {{ (a.alimento_perro_kg || 0) | number }} Kg</span>
            <span class="text-teal-800 font-bold font-sans">🐈 {{ (a.alimento_gato_kg || 0) | number }} Kg</span>
            <span class="text-amber-800 font-extrabold font-sans">📦 {{ (a.total_alimento_seco_kg || 0) | number }} Kg</span>
            <span class="text-slate-400 text-xs font-sans font-bold transform transition-transform" 
                  [ngClass]="actasAbiertas[a.id_documento] ? 'rotate-180 text-sky-600' : ''">
              ▼
            </span>
          </div>
        </div>

        <!-- PANEL FORENSE DESPLEGABLE -->
        <div *ngIf="actasAbiertas[a.id_documento]" 
             class="p-5 bg-slate-50/90 border-t border-slate-200 space-y-4">
          
          <div *ngIf="loadingDetalle[a.id_documento]" 
               class="text-xs text-slate-500 animate-pulse text-center py-4 font-medium">
            Cargando expediente forense y cruce de insumos...
          </div>

          <div *ngIf="detallesCargados[a.id_documento] as det" 
               class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            <!-- COLUMNA 1: AYUDA HUMANITARIA Y SUMINISTROS -->
            <div class="space-y-3 bg-white p-4 rounded-2xl border border-slate-300 shadow-xs">
              <h5 class="text-xs font-bold text-emerald-900 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <span>📦</span> Ayuda Humanitaria Entregada
              </h5>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                  <span class="text-slate-500 block text-[10px] font-bold uppercase truncate">Húmeda Perro</span>
                  <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento?.comida_humeda_perro_und || 0 }} Und</b>
                </div>
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                  <span class="text-slate-500 block text-[10px] font-bold uppercase truncate">Húmeda Gato</span>
                  <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento?.comida_humeda_gato_und || 0 }} Und</b>
                </div>
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                  <span class="text-slate-500 block text-[10px] font-bold uppercase truncate">Arena Sanitaria</span>
                  <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento?.arena_kg || 0 }} Kg</b>
                </div>
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                  <span class="text-slate-500 block text-[10px] font-bold uppercase truncate">Huacales</span>
                  <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento?.huacales_und || 0 }} Und</b>
                </div>
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                  <span class="text-slate-500 block text-[10px] font-bold uppercase truncate">Areneros</span>
                  <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento?.areneros_und || 0 }} Und</b>
                </div>
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                  <span class="text-slate-500 block text-[10px] font-bold uppercase truncate">Comederos</span>
                  <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento?.recipientes_und || 0 }} Und</b>
                </div>
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                  <span class="text-slate-500 block text-[10px] font-bold uppercase truncate">Camas / Cobijas</span>
                  <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento?.camas_und || 0 }} / {{ det.alimento?.cobijas_und || 0 }}</b>
                </div>
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                  <span class="text-slate-500 block text-[10px] font-bold uppercase truncate">Collares</span>
                  <b class="text-slate-900 font-extrabold block mt-0.5 whitespace-nowrap">{{ det.alimento?.collares_und || 0 }} Und</b>
                </div>
              </div>

              <!-- OTROS ARTÍCULOS -->
              <div *ngIf="parseOtrosArticulos(det.alimento?.otros_articulos_json).length > 0" 
                   class="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-800 border border-slate-300">
                <b class="text-slate-900 font-bold">Otros Artículos:</b>
                <span *ngFor="let item of parseOtrosArticulos(det.alimento?.otros_articulos_json); let last = last">
                  {{ item.cantidad }} {{ item.unidad }} {{ item.articulo }}{{ last ? '' : ', ' }}
                </span>
              </div>
            </div>

            <!-- COLUMNA 2: CRUCE FARMACOLÓGICO -->
            <div class="space-y-3 bg-white p-4 rounded-2xl border border-slate-300 shadow-xs">
              <h5 class="text-xs font-bold text-purple-900 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <span>💊</span> Cruce Farmacológico (Enlace: {{ det.alimento?.codigo_acta_vinculante }})
              </h5>

              <div *ngIf="!det.tiene_medicamentos" 
                   class="p-6 bg-slate-50 rounded-xl text-xs text-slate-500 font-medium italic text-center border border-slate-200">
                Sin insumos farmacológicos vinculados en este despacho.
              </div>

              <div *ngIf="det.tiene_medicamentos" 
                   class="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                <div *ngFor="let cat of getCategoriasFarmacos(det.medicamentos_por_categoria)" 
                     class="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200 space-y-1">
                  <p class="text-[11px] font-bold text-purple-900 uppercase">{{ cat }}</p>
                  <div class="space-y-1 text-xs text-slate-800 font-medium">
                    <div *ngFor="let m of det.medicamentos_por_categoria[cat]" class="flex justify-between border-b border-purple-100 pb-0.5">
                      <span>• <b>{{ m.medicamento_insumo }}</b></span>
                      <span class="font-mono font-bold text-purple-800 whitespace-nowrap">{{ m.cantidad }} {{ m.unidad }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- COLUMNA 3: EVIDENCIA FOTOGRÁFICA Y AUDITORÍA -->
            <div class="space-y-3 bg-white p-4 rounded-2xl border border-slate-300 shadow-xs flex flex-col justify-between">
              <div>
                <h5 class="text-xs font-bold text-sky-900 flex items-center gap-1.5 mb-2 border-b border-slate-200 pb-2">
                  <span>🖼️</span> Evidencia Documental Escaneada
                </h5>
                <div class="bg-slate-100 border border-slate-300 rounded-xl overflow-hidden cursor-pointer group relative h-36 flex items-center justify-center shadow-2xs"
                     (click)="abrirModalFoto(det.alimento?.archivo_imagen, 'Acta Oficial ' + det.alimento?.id_documento)">
                  <img [src]="sismoService.getUrlFoto(det.alimento?.archivo_imagen)" 
                       alt="Miniatura Acta" 
                       class="w-full h-full object-cover group-hover:scale-105 transition">
                  <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span class="px-3 py-1.5 bg-sky-600 text-white text-xs font-bold rounded-lg shadow-md">
                      🔍 Ampliar en HD
                    </span>
                  </div>
                </div>
              </div>

              <div class="pt-2 text-[10px] text-slate-600 font-mono border-t border-slate-200 space-y-0.5">
                <div>Autorizador: <b>{{ det.alimento?.autoriza_nombre || 'N/A' }}</b></div>
                <div>Receptor: <b>{{ det.alimento?.recibe_nombre || 'N/A' }}</b> (CC: {{ det.alimento?.recibe_cedula || 'N/A' }})</div>
              </div>
            </div>

          </div>
        </div>

      </div>
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
(buscador_dir / "buscador.component.html").write_text(html_code, encoding="utf-8")

# 5. Estilos SCSS (buscador.component.scss)
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
  background: #0284c7;
}
"""
(buscador_dir / "buscador.component.scss").write_text(scss_code, encoding="utf-8")

print(f"✅ Módulo Buscador generado exitosamente en: {buscador_dir}")

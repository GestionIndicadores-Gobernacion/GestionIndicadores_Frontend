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

albergues_dir = FRONTEND_DIR / "src" / "app" / "features" / "sismo" / "pages" / "albergues"
albergues_dir.mkdir(parents=True, exist_ok=True)
service_file = FRONTEND_DIR / "src" / "app" / "core" / "services" / "sismo.service.ts"

# 2. Asegurar que sismo.service.ts tenga getCensoDatos
if service_file.exists():
    srv_code = service_file.read_text(encoding="utf-8")
    if "getCensoDatos" not in srv_code:
        idx = srv_code.rfind("}")
        m_censo = """
  getCensoDatos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/censo/datos`);
  }
"""
        srv_code = srv_code[:idx] + m_censo + srv_code[idx:]
        service_file.write_text(srv_code, encoding="utf-8")
        print("✅ sismo.service.ts actualizado con getCensoDatos.")

# 3. Componente TypeScript (albergues.component.ts) con tipado estricto
ts_code = """import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SismoService } from '../../../../core/services/sismo.service';

@Component({
  selector: 'app-sismo-albergues',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './albergues.component.html',
  styleUrls: ['./albergues.component.scss']
})
export class AlberguesComponent implements OnInit {
  sismoService = inject(SismoService);

  censoGlobal: any[] = [];
  filtrados: any[] = [];
  loading = false;

  filtros = {
    q: '',
    mun: '',
    prio: '',
    estado: ''
  };

  kpis = {
    totalAlbergues: 0,
    totalAnimales: 0,
    riesgoCritico: 0,
    reportesDanio: 0
  };

  private debounceTimer: any;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.sismoService.getCensoDatos().subscribe({
      next: (data: any) => {
        this.censoGlobal = data || [];
        this.calcularKpisGlobales(this.censoGlobal);
        this.filtrarUI();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar datos del censo:', err);
        this.loading = false;
      }
    });
  }

  calcularKpisGlobales(lista: any[]): void {
    let anim = 0;
    let crit = 0;
    let danios = 0;

    for (const c of lista) {
      anim += Number(c.total_animales_censados || 0);
      const prio = (c.prioridad || '').toUpperCase();
      if (prio.includes('CRÍ') || prio.includes('CRIT') || prio === 'ALTA') {
        crit++;
      }
      if (c.afectacion_refugio && c.afectacion_refugio !== 'nan' && c.afectacion_refugio.trim().length > 0) {
        danios++;
      }
    }

    this.kpis = {
      totalAlbergues: lista.length,
      totalAnimales: anim,
      riesgoCritico: crit,
      reportesDanio: danios
    };
  }

  onFiltroChange(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.filtrarUI();
    }, 200);
  }

  filtrarUI(): void {
    const q = (this.filtros.q || '').toLowerCase().trim();
    const mun = (this.filtros.mun || '').toLowerCase().trim();
    const prio = (this.filtros.prio || '').toUpperCase().trim();
    const estado = (this.filtros.estado || '').toUpperCase().trim();

    this.filtrados = this.censoGlobal.filter((item: any) => {
      const matchQ = !q ||
        (item.nombre_refugio_fundacion || '').toLowerCase().includes(q) ||
        (item.nombre_responsable || '').toLowerCase().includes(q) ||
        (item.telefono_principal || '').toLowerCase().includes(q) ||
        (item.direccion || '').toLowerCase().includes(q);

      const matchMun = !mun || (item.municipio || '').toLowerCase().includes(mun);
      const matchPrio = !prio || (item.prioridad || '').toUpperCase().includes(prio);
      const matchEstado = !estado || (item.estado_entrega_alimento || '').toUpperCase().includes(estado);

      return matchQ && matchMun && matchPrio && matchEstado;
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      q: '',
      mun: '',
      prio: '',
      estado: ''
    };
    this.filtrarUI();
  }

  esCritica(prio: string): boolean {
    const p = (prio || '').toUpperCase();
    return p.includes('CRÍ') || p.includes('CRIT');
  }

  esAlta(prio: string): boolean {
    return (prio || '').toUpperCase() === 'ALTA';
  }

  exportarCriticosCSV(): void {
    const listaAExportar = this.filtrados.length > 0 ? this.filtrados : this.censoGlobal;
    if (listaAExportar.length === 0) {
      alert('No hay registros de albergues para exportar.');
      return;
    }

    const headers = [
      'Municipio',
      'Refugio o Fundación',
      'Prioridad Riesgo',
      'Responsable',
      'Telefono Principal',
      'Telefono Secundario',
      'Direccion',
      'Barrio/Vereda',
      'Perros Censados',
      'Gatos Censados',
      'Total Animales',
      'Afectacion / Daños EDAN',
      'Necesidades / Observaciones',
      'Estado Entrega Alimento'
    ];

    const rows = listaAExportar.map((c: any) => [
      `\"${(c.municipio || '').replace(/\"/g, '\"\"')}\"`,
      `\"${(c.nombre_refugio_fundacion || '').replace(/\"/g, '\"\"')}\"`,
      c.prioridad || 'MEDIA',
      `\"${(c.nombre_responsable || '').replace(/\"/g, '\"\"')}\"`,
      c.telefono_principal || '',
      c.telefono_secundario || '',
      `\"${(c.direccion || '').replace(/\"/g, '\"\"')}\"`,
      `\"${(c.barrio_vereda_corregimiento || '').replace(/\"/g, '\"\"')}\"`,
      c.perros_censados || 0,
      c.gatos_censados || 0,
      c.total_animales_censados || 0,
      `\"${(c.afectacion_refugio || '').replace(/\"/g, '\"\"')}\"`,
      `\"${(c.necesidades_observaciones || '').replace(/\"/g, '\"\"')}\"`,
      c.estado_entrega_alimento || 'PENDIENTE'
    ]);

    const saltoLinea = String.fromCharCode(10);
    const lineas = [headers.join(','), ...rows.map((e: any) => e.join(','))];
    const csvContent = '\\uFEFF' + lineas.join(saltoLinea);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `censo_albergues_edan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
"""
(albergues_dir / "albergues.component.ts").write_text(ts_code, encoding="utf-8")

# 4. Plantilla HTML (albergues.component.html) con alto contraste institucional
html_code = """<div class="space-y-6 pb-6">

  <!-- ENCABEZADO INSTITUCIONAL -->
  <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
    <div class="flex items-center gap-3.5">
      <div class="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 flex items-center justify-center font-bold text-xl shadow-xs">
        🏠
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-bold text-slate-900 tracking-tight">
            Censo de Albergues y Evaluación EDAN
          </h1>
          <span class="px-2.5 py-0.5 text-[11px] font-bold font-mono bg-amber-100 text-amber-800 border border-amber-300 rounded-md">
            GESTIÓN DEL RIESGO
          </span>
        </div>
        <p class="text-xs text-slate-600 mt-0.5 font-medium">
          Evaluación de daños estructurales, georreferenciación de refugios y censo poblacional animal post-sismo
        </p>
      </div>
    </div>
    
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold font-mono shadow-2xs">
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span class="whitespace-nowrap">{{ filtrados.length }} Refugios Filtrados</span>
      </div>
      <button (click)="exportarCriticosCSV()" 
              class="px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 border border-rose-700 cursor-pointer">
        <span>⚠️</span>
        <span class="whitespace-nowrap">Reporte Refugios (CSV)</span>
      </button>
    </div>
  </div>

  <!-- CUADROS DE MANDO Y ESTADÍSTICAS EDAN (4 KPIS DE ALTO CONTRASTE) -->
  <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Card 1 -->
    <div class="bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
      <div class="min-w-0 pr-2">
        <p class="text-[11px] uppercase font-bold text-slate-500 truncate">Total Albergues Censados</p>
        <h3 class="text-2xl font-extrabold text-amber-800 mt-1 whitespace-nowrap">
          {{ kpis.totalAlbergues }} 
          <span class="text-xs font-semibold text-slate-600">Refugios</span>
        </h3>
      </div>
      <div class="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 flex items-center justify-center text-xl font-bold shadow-2xs shrink-0">
        🏡
      </div>
    </div>

    <!-- Card 2 -->
    <div class="bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
      <div class="min-w-0 pr-2">
        <p class="text-[11px] uppercase font-bold text-slate-500 truncate">Población Animal Total</p>
        <h3 class="text-2xl font-extrabold text-emerald-800 mt-1 whitespace-nowrap">
          {{ kpis.totalAnimales | number }} 
          <span class="text-xs font-semibold text-slate-600">Animales</span>
        </h3>
      </div>
      <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-center text-xl font-bold shadow-2xs shrink-0">
        🐾
      </div>
    </div>

    <!-- Card 3 -->
    <div class="bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
      <div class="min-w-0 pr-2">
        <p class="text-[11px] uppercase font-bold text-slate-500 truncate">Riesgo Crítico / Alto</p>
        <h3 class="text-2xl font-extrabold text-rose-800 mt-1 whitespace-nowrap">
          {{ kpis.riesgoCritico }} 
          <span class="text-xs font-semibold text-slate-600">Albergues</span>
        </h3>
      </div>
      <div class="w-11 h-11 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 flex items-center justify-center text-xl font-bold shadow-2xs shrink-0">
        🚨
      </div>
    </div>

    <!-- Card 4 -->
    <div class="bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
      <div class="min-w-0 pr-2">
        <p class="text-[11px] uppercase font-bold text-slate-500 truncate">Reportes de Daño Físico</p>
        <h3 class="text-2xl font-extrabold text-sky-800 mt-1 whitespace-nowrap">
          {{ kpis.reportesDanio }} 
          <span class="text-xs font-semibold text-slate-600">Afectaciones EDAN</span>
        </h3>
      </div>
      <div class="w-11 h-11 rounded-xl bg-sky-50 text-sky-800 border border-sky-300 flex items-center justify-center text-xl font-bold shadow-2xs shrink-0">
        🛠️
      </div>
    </div>
  </section>

  <!-- CENTRO DE FILTROS CRUZADOS AVANZADOS -->
  <section class="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">
    <div class="flex items-center justify-between border-b border-slate-200 pb-3">
      <div class="flex items-center gap-2">
        <span class="text-base">🎛️</span>
        <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Filtros Cruzados EDAN
        </h2>
      </div>
      <button (click)="limpiarFiltros()" 
              class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer">
        Limpiar Filtros
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Buscador Predictivo</label>
        <input type="text" [(ngModel)]="filtros.q" (ngModelChange)="onFiltroChange()" 
               placeholder="Refugio, responsable, teléfono, dirección..."
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Municipio</label>
        <input type="text" [(ngModel)]="filtros.mun" (ngModelChange)="onFiltroChange()" 
               placeholder="Ej: Cali, Tuluá, Buenaventura..."
               class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white font-medium transition shadow-2xs">
      </div>
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Prioridad de Riesgo</label>
        <select [(ngModel)]="filtros.prio" (ngModelChange)="onFiltroChange()" 
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white font-medium transition shadow-2xs">
          <option value="">Todas las Prioridades</option>
          <option value="CRÍTICA">CRÍTICA</option>
          <option value="ALTA">ALTA</option>
          <option value="MEDIA">MEDIA</option>
          <option value="BAJA">BAJA</option>
          <option value="PENDIENTE">PENDIENTE</option>
        </select>
      </div>
      <div>
        <label class="block text-[11px] font-bold text-slate-700 mb-1.5">Estado de Entrega</label>
        <select [(ngModel)]="filtros.estado" (ngModelChange)="onFiltroChange()" 
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white font-medium transition shadow-2xs">
          <option value="">Todos los Estados</option>
          <option value="ENTREGADO">ENTREGADO</option>
          <option value="PENDIENTE">PENDIENTE</option>
          <option value="BAJA">BAJA</option>
        </select>
      </div>
    </div>
  </section>

  <!-- TARJETAS DE EXPEDIENTE EDAN (FICHAS TÉCNICAS CON ALTO CONTRASTE) -->
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
        Fichas Técnicas de Albergues y Refugios ({{ filtrados.length }} Coincidentes)
      </h3>
    </div>

    <div *ngIf="loading" class="text-xs text-slate-500 py-12 text-center font-medium animate-pulse">
      Cargando padrón del censo EDAN...
    </div>

    <div *ngIf="!loading && filtrados.length === 0" 
         class="bg-white border border-slate-300 p-10 text-center text-slate-500 font-medium italic rounded-2xl shadow-sm">
      No se encontraron albergues con los filtros seleccionados.
    </div>

    <div *ngIf="!loading && filtrados.length > 0" 
         class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      
      <div *ngFor="let c of filtrados" 
           [ngClass]="esCritica(c.prioridad) 
             ? 'bg-rose-50/60 border-2 border-rose-300' 
             : esAlta(c.prioridad) 
             ? 'bg-amber-50/60 border-2 border-amber-300' 
             : 'bg-white border-2 border-slate-200'"
           class="p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition">
        
        <div class="space-y-3">
          <!-- Cabecera de la Tarjeta -->
          <div class="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span [ngClass]="esCritica(c.prioridad) 
                    ? 'bg-rose-100 text-rose-800 border-rose-300' 
                    : esAlta(c.prioridad) 
                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                    : 'bg-slate-100 text-slate-800 border-slate-300'"
                  class="px-2.5 py-0.5 text-[10px] font-extrabold font-mono rounded-lg border whitespace-nowrap shadow-2xs">
              RIESGO: {{ c.prioridad || 'MEDIA' }}
            </span>
            <span class="text-xs font-mono font-extrabold text-slate-800 whitespace-nowrap">
              📍 {{ c.municipio }}
            </span>
          </div>

          <!-- Nombre del Albergue -->
          <h4 class="text-sm font-extrabold text-slate-900 leading-snug">
            {{ c.nombre_refugio_fundacion || 'Hogar / Refugio Independiente' }}
          </h4>

          <!-- Datos de Contacto y Ubicación -->
          <div class="text-[11px] text-slate-800 space-y-1 bg-white p-3 rounded-xl border border-slate-300 shadow-2xs">
            <p class="truncate">👤 <b>Responsable:</b> {{ c.nombre_responsable || 'N/A' }}</p>
            <p class="truncate font-mono">
              📞 <b>Tels:</b> {{ c.telefono_principal || 'N/A' }}
              <span *ngIf="c.telefono_secundario">/ {{ c.telefono_secundario }}</span>
            </p>
            <p class="truncate">
              📍 <b>Dir:</b> {{ c.direccion || 'Sin dirección' }}
              <span *ngIf="c.barrio_vereda_corregimiento" class="text-slate-500 font-medium">({{ c.barrio_vereda_corregimiento }})</span>
            </p>
          </div>

          <!-- Conteo de Animales en una fila -->
          <div class="grid grid-cols-3 gap-1.5 text-center text-[11px] bg-white p-2.5 rounded-xl border border-slate-300 font-bold shadow-2xs font-mono whitespace-nowrap">
            <div class="text-emerald-800 font-sans">🐕 {{ c.perros_censados || 0 }}</div>
            <div class="text-teal-800 font-sans">🐈 {{ c.gatos_censados || 0 }}</div>
            <div class="text-amber-800 font-extrabold font-sans">Tot: {{ c.total_animales_censados || 0 }}</div>
          </div>

          <!-- Daños Estructurales EDAN -->
          <div *ngIf="c.afectacion_refugio && c.afectacion_refugio !== 'nan' && c.afectacion_refugio.trim().length > 0" 
               class="text-[11px] text-rose-900 bg-rose-50 p-2.5 rounded-xl border border-rose-300 font-medium">
            🚨 <b>Daños EDAN:</b> {{ c.afectacion_refugio }}
          </div>

          <!-- Necesidades Urgentes -->
          <div *ngIf="c.necesidades_observaciones && c.necesidades_observaciones !== 'nan' && c.necesidades_observaciones.trim().length > 0" 
               class="text-[11px] text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-300">
            🛠️ <b>Necesidades:</b> {{ c.necesidades_observaciones }}
          </div>
        </div>

        <!-- Pie de la Tarjeta: Estado de Entrega -->
        <div class="mt-3.5 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
          <span class="text-slate-600 text-[11px]">Estado de Ayuda:</span>
          <span [ngClass]="c.estado_entrega_alimento === 'ENTREGADO' 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-amber-100 text-amber-900 border-amber-300'"
                class="px-2.5 py-0.5 rounded-md text-[10px] font-mono border whitespace-nowrap shadow-2xs">
            {{ c.estado_entrega_alimento || 'PENDIENTE' }}
          </span>
        </div>

      </div>

    </div>
  </section>

</div>
"""
(albergues_dir / "albergues.component.html").write_text(html_code, encoding="utf-8")

# 5. Estilos SCSS (albergues.component.scss)
scss_code = """:host {
  display: block;
  width: 100%;
}
"""
(albergues_dir / "albergues.component.scss").write_text(scss_code, encoding="utf-8")

print(f"✅ Módulo Albergues generado exitosamente en: {albergues_dir}")

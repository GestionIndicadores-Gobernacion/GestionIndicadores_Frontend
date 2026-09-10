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

resumen_dir = FRONTEND_DIR / "src" / "app" / "features" / "sismo" / "pages" / "resumen"
resumen_dir.mkdir(parents=True, exist_ok=True)

# 2. HTML con contraste institucional reforzado y cero saltos de línea en cifras
html_code = """<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

<div class="space-y-6 pb-6">

  <!-- ENCABEZADO INSTITUCIONAL -->
  <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
    <div class="flex items-center gap-3.5">
      <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-xl shadow-xs">
        🐾
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-bold text-slate-900 tracking-tight">
            Puesto de Mando Unificado — Auxilio Animal
          </h1>
          <span class="px-2.5 py-0.5 text-[11px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md">
            CDGRD VALLE
          </span>
        </div>
        <p class="text-xs text-slate-600 mt-0.5 font-medium">
          Subsecretaría de Bienestar Animal — Balance Operativo y Consolidado Departamental Sismo 2026
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs">
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      Base de Datos Auditada
    </div>
  </div>

  <!-- CAJA 1: BALANCE DE CONCENTRADO (CONTRASTE ALTO Y SIN DESBORDAMIENTOS) -->
  <section class="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
      <div class="flex items-center gap-2">
        <span class="text-base">⚖️</span>
        <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Módulo 1: Balance de Concentrado y Capacidad de Reserva
        </h2>
      </div>
      <span class="text-[11px] font-mono text-slate-500 font-semibold">
        Consolidado Departamental al 20 de Agosto 2026
      </span>
    </div>

    <!-- TARJETAS DE CONCENTRADO -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div *ngFor="let item of balance" 
           class="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-400 transition shadow-xs">
        
        <div class="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
          <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {{ item.concepto }}
          </h3>
          <span class="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-300 font-bold text-slate-600 shadow-2xs">
            Kilos
          </span>
        </div>

        <!-- CUADRÍCULA DE MÉTRICAS (PROTEGIDA CONTRA SALTOS DE LÍNEA) -->
        <div class="grid grid-cols-3 gap-2 text-center">
          
          <!-- Ingreso -->
          <div class="bg-sky-50/90 border border-sky-300/80 p-2 rounded-xl flex flex-col justify-between min-w-0">
            <span class="text-[10px] text-sky-800 font-bold uppercase tracking-tight block">Ingreso</span>
            <div class="whitespace-nowrap text-sky-700 font-extrabold text-xs sm:text-sm mt-1 flex items-baseline justify-center gap-0.5">
              <span>{{ (item.total_ingresado || 0) | number }}</span>
              <span class="text-[10px] font-semibold text-sky-600">Kg</span>
            </div>
          </div>

          <!-- Despacho -->
          <div class="bg-emerald-50/90 border border-emerald-300/80 p-2 rounded-xl flex flex-col justify-between min-w-0">
            <span class="text-[10px] text-emerald-800 font-bold uppercase tracking-tight block">Despacho</span>
            <div class="whitespace-nowrap text-emerald-700 font-extrabold text-xs sm:text-sm mt-1 flex items-baseline justify-center gap-0.5">
              <span>{{ (item.total_entregado || 0) | number }}</span>
              <span class="text-[10px] font-semibold text-emerald-600">Kg</span>
            </div>
          </div>

          <!-- Reserva -->
          <div class="bg-amber-50 border border-amber-300 p-2 rounded-xl flex flex-col justify-between min-w-0 shadow-2xs">
            <span class="text-[10px] text-amber-900 font-bold uppercase tracking-tight block">Reserva</span>
            <div class="whitespace-nowrap text-amber-800 font-extrabold text-xs sm:text-sm mt-1 flex items-baseline justify-center gap-0.5">
              <span>{{ (item.stock_disponible || 0) | number }}</span>
              <span class="text-[10px] font-semibold text-amber-700">Kg</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>

  <!-- SELECTOR DE DÍAS -->
  <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-300 shadow-sm">
    <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
      <span>📅</span>
      <span>Filtrar Operaciones por Día:</span>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <button (click)="seleccionarDia('')"
              [ngClass]="diaSeleccionado === '' 
                ? 'bg-emerald-600 text-white font-bold shadow-xs border border-emerald-700' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-medium'"
              class="px-3 py-1.5 text-xs rounded-xl transition cursor-pointer">
        Todos (Acumulado)
      </button>
      <button *ngFor="let dia of diasDisponibles" (click)="seleccionarDia(dia)"
              [ngClass]="diaSeleccionado === dia 
                ? 'bg-emerald-600 text-white font-bold shadow-xs border border-emerald-700' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-medium'"
              class="px-3 py-1.5 text-xs rounded-xl transition cursor-pointer">
        {{ dia | slice:8:10 }} Ago
      </button>
    </div>
  </div>

  <!-- MÓDULO 2: CARTOGRAFÍA Y MUNICIPIOS -->
  <section class="bg-white border border-slate-300 rounded-2xl p-5 space-y-4 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div class="flex items-center gap-2">
        <span class="text-base">🗺️</span>
        <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Módulo 2: Cartografía Departamental y Distribución Territorial
        </h2>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-[11px] font-semibold text-slate-500 mr-1">Zonas Especiales:</span>
        <button *ngFor="let ext of externos" (click)="verDetalle(ext.nombre, [ext.lat, ext.lng])"
                class="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 border border-slate-300 rounded-lg transition flex items-center gap-1.5 font-semibold cursor-pointer">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>{{ ext.nombre }}</span>
          <b class="whitespace-nowrap">({{ ext.total_kg | number }} Kg)</b>
        </button>
      </div>
    </div>

    <!-- CONTENEDOR MAPA + SIDEBAR -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[480px]">
      
      <!-- MAPA LEAFLET -->
      <div class="lg:col-span-8 bg-slate-100 rounded-2xl overflow-hidden border border-slate-300 h-[480px] relative shadow-xs">
        <div id="mapa-valle" class="w-full h-full"></div>
        <button *ngIf="detalleVisible" (click)="resetearMapa()"
                class="absolute top-3 right-3 z-[400] px-3.5 py-1.5 text-xs font-bold bg-white/95 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-300 shadow-md transition flex items-center gap-1.5 cursor-pointer">
          ↺ Vista General Valle
        </button>
      </div>

      <!-- SIDEBAR LATERAL CON CONTRASTE ALTO -->
      <div class="lg:col-span-4 bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-[480px] overflow-hidden">
        
        <!-- VISTA LISTA -->
        <div *ngIf="!detalleVisible" class="flex flex-col h-full">
          <div class="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-2.5">
            <span class="text-xs font-bold text-slate-800">Municipios Atendidos</span>
            <span class="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
              {{ municipiosFiltrados.length }} Sede(s)
            </span>
          </div>

          <input type="text" [(ngModel)]="busquedaMun" (input)="filtrarMunicipios()" placeholder="Buscar municipio..."
                 class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 mb-2.5 focus:outline-none focus:border-emerald-500 shadow-2xs font-medium">

          <div class="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            <div *ngFor="let m of municipiosFiltrados" (click)="verDetalle(m.nombre, [m.lat, m.lng])"
                 (mouseenter)="resaltarMunicipio(m.nombre, true)" (mouseleave)="resaltarMunicipio(m.nombre, false)"
                 class="p-3 bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl cursor-pointer transition flex items-center justify-between shadow-2xs">
              <div class="min-w-0 pr-2">
                <h4 class="text-xs font-bold text-slate-900 truncate">{{ m.nombre }}</h4>
                <p class="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
                  🐕 {{ (m.perro_kg || 0) | number }} Kg &nbsp;|&nbsp; 🐈 {{ (m.gato_kg || 0) | number }} Kg
                </p>
              </div>
              <div class="text-right whitespace-nowrap pl-2">
                <span class="text-xs font-extrabold text-emerald-700 block">
                  {{ (m.total_kg || 0) | number }} Kg
                </span>
              </div>
            </div>
            <p *ngIf="municipiosFiltrados.length === 0" class="text-xs text-slate-400 py-8 text-center font-medium">
              No hay despachos registrados.
            </p>
          </div>
        </div>

        <!-- VISTA DETALLE -->
        <div *ngIf="detalleVisible" class="flex flex-col h-full justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
              <h3 class="text-sm font-extrabold text-emerald-800 flex items-center gap-1.5">
                📍 {{ municipioSeleccionado }}
              </h3>
              <button (click)="cerrarDetalle()" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[11px] max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
              <div *ngFor="let st of estadisticasDetalle"
                   [ngClass]="{
                     'col-span-2 bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl shadow-2xs': st.tipo === 'perro',
                     'col-span-2 bg-teal-50 border border-teal-300 p-2.5 rounded-xl shadow-2xs': st.tipo === 'gato',
                     'col-span-2 bg-amber-50 border border-amber-300 p-2.5 rounded-xl shadow-2xs': st.tipo === 'total',
                     'bg-white border border-slate-300 p-2 rounded-xl shadow-2xs': st.tipo === 'normal'
                   }">
                <p class="text-[10px] text-slate-500 uppercase font-bold truncate">{{ st.key }}</p>
                <b class="text-xs font-extrabold mt-0.5 block whitespace-nowrap" [ngClass]="{
                  'text-emerald-800': st.tipo === 'perro',
                  'text-teal-800': st.tipo === 'gato',
                  'text-amber-800': st.tipo === 'total',
                  'text-slate-800': st.tipo === 'normal'
                }">{{ st.val }}</b>
              </div>
            </div>
          </div>

          <div *ngIf="puntosDetalle.length > 0" class="pt-2.5 border-t border-slate-200 mt-2">
            <p class="text-[11px] font-bold text-slate-700 mb-1">Puntos de Entrega Notables:</p>
            <div class="text-[10px] text-slate-700 max-h-[110px] overflow-y-auto custom-scrollbar space-y-1 bg-white p-2 rounded-xl border border-slate-300 shadow-2xs">
              <div *ngFor="let p of puntosDetalle" class="flex items-center justify-between border-b border-slate-100 pb-1">
                <span class="truncate pr-1">📍 <b>{{ p.barrio_corregimiento_refugio }}</b></span>
                <span class="text-emerald-700 font-extrabold whitespace-nowrap">{{ p.total_alimento_seco_kg | number }} Kg</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- DOCK INFERIOR (5 MÓDULOS) CON TARJETAS NÍTIDAS -->
  <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pb-4">
    
    <div routerLink="/sismo/despachos"
         class="group bg-white border-2 border-slate-200 hover:border-emerald-500 p-4 rounded-2xl cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md transition">
      <div class="flex items-center justify-between">
        <div class="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-300 font-bold">
          🚚
        </div>
        <span class="text-slate-400 group-hover:text-emerald-600 transition font-bold text-xs">↗</span>
      </div>
      <div class="mt-3">
        <h4 class="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition">1. Despachos</h4>
        <p class="text-[11px] text-slate-500 mt-0.5">Buscador multimétrica</p>
        <p class="text-[10px] font-semibold text-emerald-800 mt-2 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 truncate">
          {{ dockResumen.despachos }}
        </p>
      </div>
    </div>

    <div routerLink="/sismo/buscador"
         class="group bg-white border-2 border-slate-200 hover:border-sky-500 p-4 rounded-2xl cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md transition">
      <div class="flex items-center justify-between">
        <div class="p-2.5 bg-sky-50 text-sky-800 rounded-xl border border-sky-300 font-bold">
          📄
        </div>
        <span class="text-slate-400 group-hover:text-sky-600 transition font-bold text-xs">↗</span>
      </div>
      <div class="mt-3">
        <h4 class="text-xs font-bold text-slate-800 group-hover:text-sky-700 transition">2. Actas & Fotos</h4>
        <p class="text-[11px] text-slate-500 mt-0.5">Trazabilidad forense</p>
        <p class="text-[10px] font-semibold text-sky-800 mt-2 bg-sky-50 px-2 py-1 rounded-lg border border-sky-200 truncate">
          {{ dockResumen.actas }}
        </p>
      </div>
    </div>

    <div routerLink="/sismo/farmacologia"
         class="group bg-white border-2 border-slate-200 hover:border-purple-500 p-4 rounded-2xl cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md transition">
      <div class="flex items-center justify-between">
        <div class="p-2.5 bg-purple-50 text-purple-800 rounded-xl border border-purple-300 font-bold">
          💊
        </div>
        <span class="text-slate-400 group-hover:text-purple-600 transition font-bold text-xs">↗</span>
      </div>
      <div class="mt-3">
        <h4 class="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition">3. Farmacología</h4>
        <p class="text-[11px] text-slate-500 mt-0.5">Insumos y cirugías</p>
        <p class="text-[10px] font-semibold text-purple-800 mt-2 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200 truncate">
          {{ dockResumen.farmacologia }}
        </p>
      </div>
    </div>

    <div routerLink="/sismo/albergues"
         class="group bg-white border-2 border-slate-200 hover:border-amber-500 p-4 rounded-2xl cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md transition">
      <div class="flex items-center justify-between">
        <div class="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-300 font-bold">
          🏠
        </div>
        <span class="text-slate-400 group-hover:text-amber-600 transition font-bold text-xs">↗</span>
      </div>
      <div class="mt-3">
        <h4 class="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition">4. Censo Albergues</h4>
        <p class="text-[11px] text-slate-500 mt-0.5">Evaluación EDAN sismo</p>
        <p class="text-[10px] font-semibold text-amber-800 mt-2 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 truncate">
          {{ dockResumen.censo }}
        </p>
      </div>
    </div>

    <div routerLink="/sismo/voluntarios"
         class="group bg-white border-2 border-slate-200 hover:border-rose-500 p-4 rounded-2xl cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md transition">
      <div class="flex items-center justify-between">
        <div class="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-300 font-bold">
          👥
        </div>
        <span class="text-slate-400 group-hover:text-rose-600 transition font-bold text-xs">↗</span>
      </div>
      <div class="mt-3">
        <h4 class="text-xs font-bold text-slate-800 group-hover:text-rose-700 transition">5. Red Humana</h4>
        <p class="text-[11px] text-slate-500 mt-0.5">Voluntarios y Donantes</p>
        <p class="text-[10px] font-semibold text-rose-800 mt-2 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 truncate">
          {{ dockResumen.red_humana }}
        </p>
      </div>
    </div>

  </section>

</div>
"""

(resumen_dir / "resumen.component.html").write_text(html_code, encoding="utf-8")
print(f"✅ HTML actualizado con alto contraste y sin saltos de línea en: {resumen_dir / 'resumen.component.html'}")

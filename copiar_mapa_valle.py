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

# 2. TypeScript con carga de GeoJSON y coropletas de calor de concentrado
ts_code = """import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SismoService } from '../../../../core/services/sismo.service';

declare let L: any;

@Component({
  selector: 'app-sismo-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './resumen.component.html',
  styleUrls: ['./resumen.component.scss']
})
export class ResumenComponent implements OnInit, AfterViewInit {
  private sismoService = inject(SismoService);
  private cdr = inject(ChangeDetectorRef);

  balance: any[] = [];
  municipios: any[] = [];
  municipiosFiltrados: any[] = [];
  externos: any[] = [];
  dockResumen: any = {
    despachos: 'Cargando...',
    actas: 'Cargando...',
    farmacologia: 'Cargando...',
    censo: 'Cargando...',
    red_humana: 'Cargando...'
  };

  diaSeleccionado = '';
  busquedaMun = '';
  diasDisponibles = [
    '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15',
    '2026-08-16', '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20'
  ];

  detalleVisible = false;
  municipioSeleccionado = '';
  estadisticasDetalle: any[] = [];
  puntosDetalle: any[] = [];
  loadingDetalle = false;

  // Mapa Vectorial GeoJSON
  private map: any = null;
  private geoJsonLayer: any = null;
  private geoJsonData: any = null;
  private polygonByKey = new Map<string, any>();
  private selectedLayer: any = null;
  private leafletListo = false;
  private maxKg = 1;

  private readonly GEOJSON_URL = encodeURI('assets/geojsons/VALLE_DEL _CAUCA_SIMPLIFICADO.geojson');

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngAfterViewInit(): void {
    this.asegurarLeaflet().then(() => {
      this.inicializarMapa();
      this.cargarGeoJson();
    });
  }

  private asegurarLeaflet(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof L !== 'undefined') {
        this.leafletListo = true;
        return resolve();
      }
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        this.leafletListo = true;
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  private inicializarMapa(): void {
    const el = document.getElementById('mapa-valle');
    if (!el || typeof L === 'undefined' || this.map) return;

    this.map = L.map('mapa-valle', {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true
    }).setView([3.85, -76.35], 8.5);
  }

  private cargarGeoJson(): void {
    fetch(this.GEOJSON_URL)
      .then(res => res.json())
      .then(data => {
        this.geoJsonData = data;
        this.renderizarPoligonos();
      })
      .catch(err => {
        console.warn('No se pudo cargar el GeoJSON local, reintentando:', err);
      });
  }

  cargarDatos(): void {
    this.sismoService.getResumenGeneral(this.diaSeleccionado).subscribe({
      next: (data: any) => {
        this.balance = data?.balance || [];
        this.municipios = data?.municipios || [];
        this.municipiosFiltrados = [...this.municipios];
        this.externos = data?.externos || [];
        this.dockResumen = data?.dock_resumen || this.dockResumen;

        const max = Math.max(...this.municipios.map(m => m.total_kg || 0), 1);
        this.maxKg = max > 0 ? max : 1;

        this.renderizarPoligonos();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error cargando resumen:', err);
      }
    });
  }

  seleccionarDia(dia: string): void {
    this.diaSeleccionado = dia;
    this.cargarDatos();
  }

  filtrarMunicipios(): void {
    const q = this.busquedaMun.trim().toLowerCase();
    if (!q) {
      this.municipiosFiltrados = [...this.municipios];
    } else {
      this.municipiosFiltrados = this.municipios.filter(m =>
        m.nombre.toLowerCase().includes(q)
      );
    }
  }

  // Normalización para cruzar MpNombre del GeoJSON con la base de datos
  private normalizarNombre(str: string): string {
    if (!str) return '';
    let s = str.toLowerCase()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
    if (s.includes('buga')) return 'buga';
    if (s.includes('cali')) return 'cali';
    if (s.includes('dari')) return 'calimadarien';
    if (s.includes('cerrito')) return 'elcerrito';
    if (s.includes('dovio')) return 'eldovio';
    if (s.includes('aguila')) return 'elaguila';
    if (s.includes('bolivar')) return 'bolivar';
    return s;
  }

  private getColor(kg: number): string {
    if (!kg || kg <= 0) return '#F1F5F9'; // Sin despacho: gris claro
    const ratio = kg / this.maxKg;
    if (ratio < 0.15) return '#A7F3D0'; // Nivel 1: Verde suave
    if (ratio < 0.40) return '#34D399'; // Nivel 2: Esmeralda medio
    if (ratio < 0.70) return '#059669'; // Nivel 3: Verde institucional
    return '#065F46';                   // Nivel 4: Esmeralda profundo
  }

  private renderizarPoligonos(): void {
    if (!this.map || !this.geoJsonData || typeof L === 'undefined') return;

    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
      this.geoJsonLayer = null;
    }

    this.polygonByKey.clear();
    this.selectedLayer = null;

    // Mapa auxiliar por nombre normalizado
    const dataMap = new Map<string, any>();
    this.municipios.forEach(m => {
      dataMap.set(this.normalizarNombre(m.nombre), m);
    });

    this.geoJsonLayer = L.geoJSON(this.geoJsonData, {
      style: (feature: any) => {
        const rawName = feature?.properties?.MpNombre || '';
        const key = this.normalizarNombre(rawName);
        const item = dataMap.get(key);
        const kg = item ? Number(item.total_kg || 0) : 0;

        return {
          fillColor: this.getColor(kg),
          weight: 1.2,
          opacity: 1,
          color: '#ffffff',
          fillOpacity: 0.88
        };
      },
      onEachFeature: (feature: any, layer: any) => {
        const rawName = feature?.properties?.MpNombre || 'Municipio';
        const key = this.normalizarNombre(rawName);
        const item = dataMap.get(key);
        const kg = item ? Number(item.total_kg || 0) : 0;
        const perro = item ? Number(item.perro_kg || 0) : 0;
        const gato = item ? Number(item.gato_kg || 0) : 0;

        this.polygonByKey.set(key, layer);

        // Tooltip idéntico al estilo institucional
        const tooltipHtml = `
          <div style="font-family:system-ui;min-width:130px;padding:2px;">
            <div style="font-size:12px;font-weight:800;color:#0f172a;text-transform:uppercase;">${rawName}</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px;">
              ${kg > 0 ? 'Despacho Acumulado' : 'Sin despachos registrados'}
            </div>
            ${kg > 0 ? `
              <div style="margin-top:5px;padding-top:4px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:12px;font-weight:800;color:#047857;">${kg.toLocaleString()} Kg</span>
                <span style="font-size:10px;color:#475569;font-weight:600;">🐕 ${perro.toLocaleString()} | 🐈 ${gato.toLocaleString()}</span>
              </div>
            ` : ''}
          </div>
        `;
        layer.bindTooltip(tooltipHtml, { sticky: true });

        // Eventos
        layer.on({
          mouseover: (e: any) => {
            const target = e.target;
            if (target === this.selectedLayer) return;
            target.setStyle({ weight: 2.5, color: '#1B3A6B', fillOpacity: 0.95 });
            target.bringToFront();
          },
          mouseout: (e: any) => {
            const target = e.target;
            if (target === this.selectedLayer) return;
            this.geoJsonLayer.resetStyle(target);
          },
          click: () => {
            this.verDetalle(rawName, layer.getBounds());
          }
        });
      }
    }).addTo(this.map);

    this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [10, 10] });
  }

  verDetalle(nombre: string, bounds?: any): void {
    this.municipioSeleccionado = nombre;
    this.detalleVisible = true;
    this.loadingDetalle = true;

    // Resaltar polígono en el mapa
    const key = this.normalizarNombre(nombre);
    const layer = this.polygonByKey.get(key);

    if (this.selectedLayer && this.geoJsonLayer) {
      this.geoJsonLayer.resetStyle(this.selectedLayer);
    }

    if (layer) {
      this.selectedLayer = layer;
      layer.setStyle({ weight: 3, color: '#1B3A6B', fillOpacity: 1 });
      layer.bringToFront();
      if (this.map) {
        this.map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 11 });
      }
    } else if (bounds && this.map) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }

    this.sismoService.getMunicipioDetalle(nombre, this.diaSeleccionado).subscribe({
      next: (data: any) => {
        this.estadisticasDetalle = data?.estadisticas_ordenadas || [];
        this.puntosDetalle = data?.puntos || [];
        this.loadingDetalle = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingDetalle = false;
      }
    });
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.municipioSeleccionado = '';
    this.estadisticasDetalle = [];
    this.puntosDetalle = [];

    if (this.selectedLayer && this.geoJsonLayer) {
      this.geoJsonLayer.resetStyle(this.selectedLayer);
      this.selectedLayer = null;
    }
    this.resetearMapa();
  }

  resetearMapa(): void {
    if (this.map && this.geoJsonLayer) {
      this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [10, 10] });
    }
  }

  resaltarMunicipio(nombre: string, highlight: boolean): void {
    const key = this.normalizarNombre(nombre);
    const layer = this.polygonByKey.get(key);
    if (!layer || layer === this.selectedLayer) return;

    if (highlight) {
      layer.setStyle({ weight: 2.5, color: '#1B3A6B', fillOpacity: 0.95 });
      layer.bringToFront();
    } else {
      this.geoJsonLayer?.resetStyle(layer);
    }
  }
}
"""
(resumen_dir / "resumen.component.ts").write_text(ts_code, encoding="utf-8")

# 3. HTML con el contenedor del mapa vectorial y leyenda
html_code = """<div class="p-4 sm:p-6 lg:p-8 pb-12 space-y-6">

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

  <!-- CAJA 1: BALANCE DE CONCENTRADO -->
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

        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-sky-50/90 border border-sky-300/80 p-2 rounded-xl flex flex-col justify-between min-w-0">
            <span class="text-[10px] text-sky-800 font-bold uppercase tracking-tight block">Ingreso</span>
            <div class="whitespace-nowrap text-sky-700 font-extrabold text-xs sm:text-sm mt-1 flex items-baseline justify-center gap-0.5">
              <span>{{ (item.total_ingresado || 0) | number }}</span>
              <span class="text-[10px] font-semibold text-sky-600">Kg</span>
            </div>
          </div>

          <div class="bg-emerald-50/90 border border-emerald-300/80 p-2 rounded-xl flex flex-col justify-between min-w-0">
            <span class="text-[10px] text-emerald-800 font-bold uppercase tracking-tight block">Despacho</span>
            <div class="whitespace-nowrap text-emerald-700 font-extrabold text-xs sm:text-sm mt-1 flex items-baseline justify-center gap-0.5">
              <span>{{ (item.total_entregado || 0) | number }}</span>
              <span class="text-[10px] font-semibold text-emerald-600">Kg</span>
            </div>
          </div>

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

  <!-- MÓDULO 2: CARTOGRAFÍA VECTORIAL OFICIAL DEL VALLE -->
  <section class="bg-white border border-slate-300 rounded-2xl p-5 space-y-4 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div class="flex items-center gap-2">
        <span class="text-base">🗺️</span>
        <div>
          <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Módulo 2: Distribución Territorial y Cobertura Municipal
          </h2>
          <p class="text-[11px] text-slate-500 font-medium">
            Mapa vectorial oficial de los 42 municipios del Valle del Cauca
          </p>
        </div>
      </div>

      <!-- Leyenda de calor -->
      <div class="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
        <span>Sin despachos</span>
        <span class="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300"></span>
        <span class="ml-1">Menor</span>
        <span class="w-3.5 h-3.5 rounded bg-emerald-200 border border-emerald-300"></span>
        <span class="w-3.5 h-3.5 rounded bg-emerald-400 border border-emerald-500"></span>
        <span class="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-700"></span>
        <span class="w-3.5 h-3.5 rounded bg-emerald-800 border border-emerald-900"></span>
        <span>Mayor carga</span>
      </div>
    </div>

    <!-- CONTENEDOR MAPA + SIDEBAR -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[520px]">
      
      <!-- MAPA VECTORIAL LEAFLET -->
      <div class="lg:col-span-8 bg-slate-50 rounded-2xl overflow-hidden border border-slate-300 h-[520px] relative shadow-xs">
        <div id="mapa-valle" class="w-full h-full"></div>
        <button *ngIf="detalleVisible" (click)="cerrarDetalle()"
                class="absolute top-3 right-3 z-[400] px-3.5 py-1.5 text-xs font-bold bg-white/95 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-300 shadow-md transition flex items-center gap-1.5 cursor-pointer">
          ↺ Vista General Valle
        </button>
      </div>

      <!-- SIDEBAR LATERAL -->
      <div class="lg:col-span-4 bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-[520px] overflow-hidden">
        
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
            <div *ngFor="let m of municipiosFiltrados" (click)="verDetalle(m.nombre)"
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

            <div class="grid grid-cols-2 gap-2 text-[11px] max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
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

  <!-- DOCK INFERIOR (5 MÓDULOS) -->
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

# 4. Estilos SCSS limpios sin fondos de mapa satelital
scss_code = """:host {
  display: block;
  width: 100%;
}

#mapa-valle {
  background: #f8fafc;
  outline: none;
}

:host ::ng-deep {
  .leaflet-container {
    background: #f8fafc !important;
    font-family: inherit;
  }
  .leaflet-tooltip {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 0.75rem !important;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
    padding: 8px 12px !important;
  }
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
(resumen_dir / "resumen.component.scss").write_text(scss_code, encoding="utf-8")

print(f"✅ Mapa vectorial del Valle del Cauca integrado con éxito en: {resumen_dir}")

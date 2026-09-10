import sys
from pathlib import Path

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

# 1. TypeScript con corrección Calima/Cali y Escala de Azul Oscuro
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
        console.warn('Error cargando GeoJSON:', err);
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

  // Clave canónica sin colisiones
  private normalizarNombre(str: string): string {
    if (!str) return '';
    const s = str.toLowerCase()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

    // REGLA CRÍTICA: Evaluar Calima antes de Cali, porque "calima" contiene "cali"
    if (s.includes('calima') || s.includes('darien')) return 'calima';
    if (s.includes('cali') || s.includes('santiagodecali')) return 'cali';
    if (s.includes('buga')) return 'buga';
    if (s.includes('cerrito')) return 'elcerrito';
    if (s.includes('dovio')) return 'eldovio';
    if (s.includes('aguila')) return 'elaguila';
    if (s.includes('bolivar')) return 'bolivar';
    if (s.includes('union')) return 'launion';
    if (s.includes('victoria')) return 'lavictoria';
    if (s.includes('cumbre')) return 'lacumbre';
    return s;
  }

  // PALETA AZUL OSCURO INSTITUCIONAL
  private getColor(kg: number): string {
    if (!kg || kg <= 0) return '#F8FAFC'; // Sin actividad: Gris pizarra neutro
    const ratio = kg / this.maxKg;
    if (ratio < 0.15) return '#93C5FD'; // Nivel 1: Azul cielo suave (blue-300)
    if (ratio < 0.40) return '#3B82F6'; // Nivel 2: Azul real (blue-500)
    if (ratio < 0.70) return '#1D4ED8'; // Nivel 3: Azul oscuro intenso (blue-700)
    return '#0F172A';                   // Nivel 4: Azul noche / Navy profundo (slate-900 / navy)
  }

  private renderizarPoligonos(): void {
    if (!this.map || !this.geoJsonData || typeof L === 'undefined') return;

    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
      this.geoJsonLayer = null;
    }

    this.polygonByKey.clear();
    this.selectedLayer = null;

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
          fillOpacity: kg > 0 ? 0.92 : 0.8
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

        const tooltipHtml = `
          <div style="font-family:system-ui;min-width:140px;padding:3px;">
            <div style="font-size:12px;font-weight:800;color:#0f172a;text-transform:uppercase;">${rawName}</div>
            <div style="font-size:10.5px;color:#64748b;margin-top:2px;">
              ${kg > 0 ? 'Despacho Acumulado' : 'Sin despachos registrados'}
            </div>
            ${kg > 0 ? `
              <div style="margin-top:6px;padding-top:5px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;font-weight:800;color:#1d4ed8;">${kg.toLocaleString()} Kg</span>
                <span style="font-size:10px;color:#475569;font-weight:600;">🐕 ${perro.toLocaleString()} | 🐈 ${gato.toLocaleString()}</span>
              </div>
            ` : ''}
          </div>
        `;
        layer.bindTooltip(tooltipHtml, { sticky: true });

        layer.on({
          mouseover: (e: any) => {
            const target = e.target;
            if (target === this.selectedLayer) return;
            target.setStyle({ weight: 2.5, color: '#38BDF8', fillOpacity: 1 });
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

    const key = this.normalizarNombre(nombre);
    const layer = this.polygonByKey.get(key);

    if (this.selectedLayer && this.geoJsonLayer) {
      this.geoJsonLayer.resetStyle(this.selectedLayer);
    }

    if (layer) {
      this.selectedLayer = layer;
      layer.setStyle({ weight: 3.5, color: '#0284C7', fillOpacity: 1 });
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
      layer.setStyle({ weight: 2.5, color: '#38BDF8', fillOpacity: 1 });
      layer.bringToFront();
    } else {
      this.geoJsonLayer?.resetStyle(layer);
    }
  }
}
"""
(resumen_dir / "resumen.component.ts").write_text(ts_code, encoding="utf-8")

# 2. HTML con leyenda en escala de azules oscuros
html_path = resumen_dir / "resumen.component.html"
html_content = html_path.read_text(encoding="utf-8")

# Reemplazar la leyenda verde por la leyenda azul oscuro
vieja_leyenda = """      <!-- Leyenda de calor -->
      <div class="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
        <span>Sin despachos</span>
        <span class="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300"></span>
        <span class="ml-1">Menor</span>
        <span class="w-3.5 h-3.5 rounded bg-emerald-200 border border-emerald-300"></span>
        <span class="w-3.5 h-3.5 rounded bg-emerald-400 border border-emerald-500"></span>
        <span class="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-700"></span>
        <span class="w-3.5 h-3.5 rounded bg-emerald-800 border border-emerald-900"></span>
        <span>Mayor carga</span>
      </div>"""

nueva_leyenda = """      <!-- Leyenda de calor en Azul Oscuro / Navy -->
      <div class="flex items-center gap-2 text-[10px] font-bold text-slate-700 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
        <span>Sin despachos</span>
        <span class="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300"></span>
        <span class="ml-1 text-slate-500">Menor</span>
        <span class="w-3.5 h-3.5 rounded bg-blue-300 border border-blue-400"></span>
        <span class="w-3.5 h-3.5 rounded bg-blue-500 border border-blue-600"></span>
        <span class="w-3.5 h-3.5 rounded bg-blue-700 border border-blue-800"></span>
        <span class="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-950"></span>
        <span class="text-slate-900">Mayor carga</span>
      </div>"""

if vieja_leyenda in html_content:
    html_content = html_content.replace(vieja_leyenda, nueva_leyenda)
    html_path.write_text(html_content, encoding="utf-8")
    print("✅ Leyenda actualizada a tonos de Azul Oscuro.")
else:
    # Si no coincidió exacto, hacer un reemplazo de clases
    html_content = html_content.replace("bg-emerald-200", "bg-blue-300").replace("bg-emerald-400", "bg-blue-500").replace("bg-emerald-600", "bg-blue-700").replace("bg-emerald-800", "bg-slate-900")
    html_path.write_text(html_content, encoding="utf-8")
    print("✅ Clases de leyenda actualizadas.")

print("✅ Mapa de Resumen actualizado: Diferenciación Calima/Cali y tonos de Azul Oscuro listos.")

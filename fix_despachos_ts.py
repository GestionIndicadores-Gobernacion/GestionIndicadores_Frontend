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

ts_file = FRONTEND_DIR / "src" / "app" / "features" / "sismo" / "pages" / "despachos" / "despachos.component.ts"

clean_ts_code = """import { Component, OnInit, inject } from '@angular/core';
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
      `\"${(r.municipio || '').replace(/\"/g, '\"\"')}\"`,
      `\"${(r.barrio_corregimiento_refugio || '').replace(/\"/g, '\"\"')}\"`,
      `\"${(r.autoriza_nombre || '').replace(/\"/g, '\"\"')}\"`,
      `\"${(r.recibe_nombre || '').replace(/\"/g, '\"\"')}\"`,
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

    const saltoLinea = String.fromCharCode(10);
    const lineas = [headers.join(','), ...rows.map((e: any) => e.join(','))];
    const csvContent = '\\uFEFF' + lineas.join(saltoLinea);
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

ts_file.write_text(clean_ts_code, encoding="utf-8")
print("✅ despachos.component.ts reparado y formateado correctamente.")

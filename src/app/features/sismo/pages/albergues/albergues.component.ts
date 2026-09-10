import { Component, OnInit, inject } from '@angular/core';
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
      `"${(c.municipio || '').replace(/"/g, '""')}"`,
      `"${(c.nombre_refugio_fundacion || '').replace(/"/g, '""')}"`,
      c.prioridad || 'MEDIA',
      `"${(c.nombre_responsable || '').replace(/"/g, '""')}"`,
      c.telefono_principal || '',
      c.telefono_secundario || '',
      `"${(c.direccion || '').replace(/"/g, '""')}"`,
      `"${(c.barrio_vereda_corregimiento || '').replace(/"/g, '""')}"`,
      c.perros_censados || 0,
      c.gatos_censados || 0,
      c.total_animales_censados || 0,
      `"${(c.afectacion_refugio || '').replace(/"/g, '""')}"`,
      `"${(c.necesidades_observaciones || '').replace(/"/g, '""')}"`,
      c.estado_entrega_alimento || 'PENDIENTE'
    ]);

    const saltoLinea = String.fromCharCode(10);
    const lineas = [headers.join(','), ...rows.map((e: any) => e.join(','))];
    const csvContent = '\uFEFF' + lineas.join(saltoLinea);
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

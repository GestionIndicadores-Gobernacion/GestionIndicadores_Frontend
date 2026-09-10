import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SismoService } from '../../../../core/services/sismo.service';

@Component({
  selector: 'app-sismo-voluntarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './voluntarios.component.html',
  styleUrls: ['./voluntarios.component.scss']
})
export class VoluntariosComponent implements OnInit {
  sismoService = inject(SismoService);

  rawRedData = {
    donantes: [] as any[],
    voluntarios: [] as any[],
    transportistas: [] as any[]
  };

  tabActiva: 'donantes' | 'voluntarios' | 'transportistas' = 'donantes';
  filtrados: any[] = [];
  loading = false;

  filtros = {
    q: '',
    mun: '',
    desde: '',
    hasta: ''
  };

  kpis = {
    totalDonantes: 0,
    totalVoluntarios: 0,
    totalTransporte: 0,
    trazabilidad: '100%'
  };

  // Panel de Auditoría Cruzada
  auditoriaVisible = false;
  auditoriaNombre = '';
  historialOperaciones: any[] = [];
  loadingHistorial = false;

  private debounceTimer: any;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.sismoService.getRedHumanaDatos().subscribe({
      next: (data: any) => {
        this.rawRedData = {
          donantes: data?.donantes || [],
          voluntarios: data?.voluntarios || [],
          transportistas: data?.transportistas || []
        };

        this.kpis = {
          totalDonantes: data?.kpis?.total_donantes || this.rawRedData.donantes.length,
          totalVoluntarios: data?.kpis?.total_voluntarios || this.rawRedData.voluntarios.length,
          totalTransporte: data?.kpis?.total_transporte || this.rawRedData.transportistas.length,
          trazabilidad: data?.kpis?.trazabilidad || '100%'
        };

        this.filtrarUI();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar Red Humana:', err);
        this.loading = false;
      }
    });
  }

  cambiarTab(tab: 'donantes' | 'voluntarios' | 'transportistas'): void {
    this.tabActiva = tab;
    this.filtrarUI();
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
    const desde = this.filtros.desde;
    const hasta = this.filtros.hasta;

    const lista = this.rawRedData[this.tabActiva] || [];

    this.filtrados = lista.filter((item: any) => {
      const nom = (item.nombre_donante || item.nombre_voluntario || item.nombre_conductor || item.nombre || '').toLowerCase();
      const doc = (item.cedula || item.documento || item.identificacion || '').toLowerCase();
      const tel = (item.telefono || item.telefono_principal || item.contacto || '').toLowerCase();
      const placa = (item.placa || item.placas || item.vehiculo || '').toLowerCase();
      const municipio = (item.municipio || item.ciudad || item.zona || '').toLowerCase();
      const fecha = item.fecha || item.fecha_registro || item.fecha_lote || '';

      const matchQ = !q || nom.includes(q) || doc.includes(q) || tel.includes(q) || placa.includes(q);
      const matchMun = !mun || municipio.includes(mun);
      const matchDesde = !desde || (fecha >= desde);
      const matchHasta = !hasta || (fecha <= hasta);

      return matchQ && matchMun && matchDesde && matchHasta;
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      q: '',
      mun: '',
      desde: '',
      hasta: ''
    };
    this.filtrarUI();
  }

  getNombre(item: any): string {
    return item.nombre_donante || item.nombre_voluntario || item.nombre_conductor || item.nombre || 'Persona Registrada';
  }

  getDocumento(item: any): string {
    return item.cedula || item.documento || item.identificacion || 'No registrada';
  }

  getTelefono(item: any): string {
    return item.telefono || item.telefono_principal || item.contacto || 'N/A';
  }

  getMunicipio(item: any): string {
    return item.municipio || item.ciudad || item.zona || 'Valle del Cauca';
  }

  getFecha(item: any): string {
    return item.fecha || item.fecha_registro || item.fecha_lote || '2026-08';
  }

  verAuditoriaCruzada(nombre: string): void {
    this.auditoriaVisible = true;
    this.auditoriaNombre = nombre;
    this.loadingHistorial = true;
    this.historialOperaciones = [];

    const call$ = (this.sismoService as any).getHistorialPersona
      ? (this.sismoService as any).getHistorialPersona(nombre)
      : (this.sismoService as any).getRedHumanaHistorial(nombre);

    call$.subscribe({
      next: (data: any) => {
        this.historialOperaciones = data || [];
        this.loadingHistorial = false;
      },
      error: (err: any) => {
        console.error('Error al consultar historial cruzado:', err);
        this.loadingHistorial = false;
      }
    });
  }

  cerrarAuditoriaCruzada(): void {
    this.auditoriaVisible = false;
    this.auditoriaNombre = '';
    this.historialOperaciones = [];
  }

  exportarPadronCSV(): void {
    const lista = this.filtrados.length > 0 ? this.filtrados : (this.rawRedData[this.tabActiva] || []);
    if (lista.length === 0) {
      alert('No hay registros para exportar en esta pestaña.');
      return;
    }

    const headers = [
      'Categoria / Rol',
      'Nombre Completo',
      'Documento / Cedula',
      'Telefono',
      'Municipio / Sede',
      'Fecha Registro',
      'Detalle Especifico'
    ];

    const rows = lista.map((item: any) => {
      let detalle = '';
      if (this.tabActiva === 'donantes') {
        detalle = item.descripcion_donacion || item.tipo_aporte || 'Concentrado e insumos en especie';
      } else if (this.tabActiva === 'voluntarios') {
        detalle = item.rol || item.cargo || 'Logística y clasificación en bodega';
      } else {
        detalle = `${item.vehiculo || 'Camioneta/Camión'} Placas: ${item.placa || item.placas || 'OFICIAL'} - Ruta: ${item.ruta || item.destino || 'Departamental'}`;
      }

      return [
        this.tabActiva.toUpperCase(),
        `"${this.getNombre(item).replace(/"/g, '""')}"`,
        this.getDocumento(item),
        this.getTelefono(item),
        `"${this.getMunicipio(item).replace(/"/g, '""')}"`,
        this.getFecha(item),
        `"${detalle.replace(/"/g, '""')}"`
      ];
    });

    const saltoLinea = String.fromCharCode(10);
    const lineas = [headers.join(','), ...rows.map((e: any) => e.join(','))];
    const csvContent = '\uFEFF' + lineas.join(saltoLinea);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `padron_${this.tabActiva}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

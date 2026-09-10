import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SismoService } from '../../../../core/services/sismo.service';

@Component({
  selector: 'app-sismo-farmacologia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './farmacologia.component.html',
  styleUrls: ['./farmacologia.component.scss']
})
export class FarmacologiaComponent implements OnInit {
  sismoService = inject(SismoService);

  filtros = {
    q: '',
    municipio: '',
    recibe: '',
    autoriza: '',
    fecha_desde: '',
    fecha_hasta: ''
  };

  categorias: { [key: string]: any } = {};
  nombresCategorias: string[] = [];
  categoriaActiva = '';
  registrosTotales = 0;
  totalUnidadesGlobal = 0;
  loading = false;

  modalFotoVisible = false;
  modalFotoUrl = '';
  modalFotoTitulo = '';

  private debounceTimer: any;

  ngOnInit(): void {
    this.cargarDatos();
  }

  onFiltroChange(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.cargarDatos();
    }, 250);
  }

  cargarDatos(): void {
    this.loading = true;
    this.sismoService.getFarmacologiaDatos(this.filtros).subscribe({
      next: (res: any) => {
        this.categorias = res?.categorias || {};
        this.nombresCategorias = Object.keys(this.categorias);
        this.registrosTotales = res?.registros_totales || 0;

        let sumaUnds = 0;
        for (const cat of this.nombresCategorias) {
          sumaUnds += this.categorias[cat]?.total_unidades || 0;
        }
        this.totalUnidadesGlobal = Math.round(sumaUnds * 10) / 10;

        if (!this.categoriaActiva || !this.categorias[this.categoriaActiva]) {
          this.categoriaActiva = this.nombresCategorias[0] || '';
        }

        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar farmacología:', err);
        this.loading = false;
      }
    });
  }

  seleccionarCategoria(cat: string): void {
    this.categoriaActiva = cat;
  }

  limpiarFiltros(): void {
    this.filtros = {
      q: '',
      municipio: '',
      recibe: '',
      autoriza: '',
      fecha_desde: '',
      fecha_hasta: ''
    };
    this.cargarDatos();
  }

  getMedsKeys(catNom: string): string[] {
    if (!this.categorias[catNom] || !this.categorias[catNom].meds) return [];
    return Object.keys(this.categorias[catNom].meds);
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

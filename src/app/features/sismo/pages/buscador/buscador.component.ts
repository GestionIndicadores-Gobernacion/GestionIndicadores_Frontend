import { Component, OnInit, inject } from '@angular/core';
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

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SismoService {
  private http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:5001/api';

  getResumenGeneral(fecha: string = ''): Observable<any> {
    const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
    return this.http.get(`${this.baseUrl}/resumen-general${query}`);
  }

  getMunicipioDetalle(nombre: string, fecha: string = ''): Observable<any> {
    const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
    return this.http.get(`${this.baseUrl}/municipio-detalle/${encodeURIComponent(nombre)}${query}`);
  }

  filtrarDespachos(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/despachos/filtrar`, payload);
  }

  buscarActas(query: string = '', desde: string = '', hasta: string = ''): Observable<any> {
    return this.http.get(`${this.baseUrl}/actas/buscar?q=${encodeURIComponent(query)}&fecha_desde=${desde}&fecha_hasta=${hasta}`);
  }

  getActaDetalle(idDoc: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/actas/detalle/${encodeURIComponent(idDoc)}`);
  }

  getFarmacologiaDatos(params: any): Observable<any> {
    const qs = new URLSearchParams(params).toString();
    return this.http.get(`${this.baseUrl}/farmacologia/datos?${qs}`);
  }

  getCensoDatos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/censo/datos`);
  }

  getRedHumanaDatos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/red-humana/datos`);
  }

  getRedHumanaHistorial(nombre: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/red-humana/historial/${encodeURIComponent(nombre)}`);
  }

  getUrlFoto(ruta: string): string {
    if (!ruta) return '';
    if (ruta.startsWith('http')) return ruta;
    const clean = ruta.replace(/^(\/|\\)+/, '');
    return `http://localhost:5001/foto/${clean}`;
  }

  getDetalleActa(idDoc: string): Observable<any> {
    return this.getActaDetalle(idDoc);
  }

  getHistorialPersona(nombre: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/red-humana/historial/${encodeURIComponent(nombre)}`);
  }
}

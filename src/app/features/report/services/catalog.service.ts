import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CatalogItemModel } from '../models/catalog-item.model';


@Injectable({
  providedIn: 'root',
})
export class CatalogService {

  private api = `${environment.apiUrl}/catalogs`;

  // Un catálogo es inmutable dentro de una sesión del usuario. Compartimos
  // la misma petición HTTP entre todos los suscriptores y retenemos el
  // último valor para que futuros suscriptores no disparen nuevas requests.
  private cache = new Map<string, Observable<CatalogItemModel[]>>();

  constructor(private http: HttpClient) { }

  /**
   * Obtiene un catálogo por nombre (ej. ACTOR_TYPE).
   * Misma petición compartida para múltiples suscriptores simultáneos,
   * y retención del resultado mientras viva el AuthService/sesión.
   */
  getByCatalog(catalogName: string): Observable<CatalogItemModel[]> {
    const key = catalogName;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const req$ = this.http
      .get<CatalogItemModel[]>(`${this.api}/${catalogName}`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    this.cache.set(key, req$);
    return req$;
  }

  /** Invalida el caché (útil al cerrar sesión o tras import masivos). */
  invalidate(catalogName?: string): void {
    if (catalogName) this.cache.delete(catalogName);
    else this.cache.clear();
  }
}

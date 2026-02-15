import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CatalogItemModel } from '../models/catalog-item.model';


@Injectable({
  providedIn: 'root',
})
export class CatalogService {

  private api = `${environment.apiUrl}/catalogs`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene un catálogo por nombre
   * Ej: ACTOR_TYPE
   */
  getByCatalog(catalogName: string) {
    return this.http.get<CatalogItemModel[]>(
      `${this.api}/${catalogName}`
    );
  }
}

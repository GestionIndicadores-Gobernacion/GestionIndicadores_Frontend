// core/services/support-panel.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Pequeño bus para que otros componentes (campana de notificaciones,
 * páginas, etc.) puedan pedirle al FAB que se abra mostrando un ticket.
 *
 * El SupportButtonComponent se suscribe a `openTicket$` y reacciona.
 */
@Injectable({ providedIn: 'root' })
export class SupportPanelService {
  private _openTicket$ = new Subject<number>();
  readonly openTicket$ = this._openTicket$.asObservable();

  requestOpenTicket(id: number): void {
    this._openTicket$.next(id);
  }
}

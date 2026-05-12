import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Punto de corte (md de Tailwind) usado para decidir si la barra
 * arranca abierta. Se mantiene en una constante para no duplicar el
 * valor entre el servicio y eventuales auto-cierres por navegación.
 */
const DESKTOP_BREAKPOINT_PX = 768;

function resolveInitialOpenState(): boolean {
  // Defensa para entornos sin DOM (SSR, tests con jsdom apagado).
  // En esos casos asumimos desktop: el primer render no es visible al
  // usuario y, si más adelante se activa SSR real, este punto debería
  // resolverse vía un token (BREAKPOINT_OBSERVER) en lugar de window.
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= DESKTOP_BREAKPOINT_PX;
}

@Injectable({ providedIn: 'root' })
export class SidebarService {

  // El estado inicial se decide UNA sola vez al construir el servicio
  // (singleton root). Como el servicio se instancia antes del primer
  // change detection del SidebarComponent — al ser inyectado en su
  // constructor —, el primer render ya usa el valor correcto: abierto
  // en desktop, cerrado en móvil. Esto evita NG0100 y flicker.
  private _isOpen = new BehaviorSubject<boolean>(resolveInitialOpenState());

  isOpen$ = this._isOpen.asObservable();

  /** Snapshot sincrónico del estado actual (para inicializar campos
   *  de componentes antes del primer render). */
  get isOpen(): boolean { return this._isOpen.value; }

  open() { this._isOpen.next(true); }

  close() { this._isOpen.next(false); }

  toggle() { this._isOpen.next(!this._isOpen.value); }

}

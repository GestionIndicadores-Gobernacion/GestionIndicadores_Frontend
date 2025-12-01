import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {

  private _open = false;
  isOpen$ = new BehaviorSubject<boolean>(this._open);

  toggle() {
    this._open = !this._open;
    this.isOpen$.next(this._open);
  }

  open() {
    this._open = true;
    this.isOpen$.next(true);
  }

  close() {
    this._open = false;
    this.isOpen$.next(false);
  }
}

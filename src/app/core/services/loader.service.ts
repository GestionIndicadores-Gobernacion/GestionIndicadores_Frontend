import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {

  private pendingRequests = 0;
  private _loading = new BehaviorSubject<boolean>(false);
  loading$ = this._loading.asObservable();

  show(): void {
    this.pendingRequests++;

    if (this.pendingRequests === 1) {
      this._loading.next(true);
    }
  }

  hide(): void {
    if (this.pendingRequests === 0) return;

    this.pendingRequests--;

    if (this.pendingRequests === 0) {
      this._loading.next(false);
    }
  }

  reset(): void {
    this.pendingRequests = 0;
    this._loading.next(false);
  }
}
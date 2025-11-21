import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class TopbarComponent {
  constructor(private auth: AuthService) { }

  logout() {
    this.auth.logout();
    window.location.href = '/auth/login';
  }
}

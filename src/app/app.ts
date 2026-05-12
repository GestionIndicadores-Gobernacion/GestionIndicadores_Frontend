import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionMonitorService } from './core/services/session-monitor.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('GestionIndicadores_Frontend');

  private sessionMonitor = inject(SessionMonitorService);

  ngOnInit(): void {
    this.sessionMonitor.start();
  }
}

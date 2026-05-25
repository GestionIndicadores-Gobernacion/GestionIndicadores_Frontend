// components/map-detail/map-detail.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { KpiOption, MunicipioSummary } from '../../reports-map.types';
import { AuthService } from '../../../../../../../core/services/auth.service';
import { PermissionService } from '../../../../../../../core/services/permission.service';
import { PERMS, ROLE_IDS } from '../../../../../../../core/constants/permissions';

@Component({
  selector: 'app-map-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './map-detail.html',
})
export class MapDetailComponent {

  isViewer = false;

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
  ) {
    // Dual mode (Fase C): perm o rol; en C7 se quita el fallback de rol.
    const payload = this.authService.getTokenPayload();
    const roleId = payload?.role_id ?? null;
    this.isViewer = !this.permissionService.hasPermissionOrRole(
      PERMS.REPORTS_CREATE, roleId, ROLE_IDS.ADMIN, ROLE_IDS.EDITOR, ROLE_IDS.MONITOR
    );
  }

  @Input() municipio!: MunicipioSummary;
  @Output() close = new EventEmitter<void>();
  @Input() activeKpi: KpiOption | null = null;
  @Input() selectedKpiId = '';

  getKpiValue(): number {
    if (!this.selectedKpiId) return this.municipio.totalReports;
    const map: Record<string, number> = {
      asistencias: this.municipio.indicators.find(i => i.id === -1)?.total ?? 0,
      denuncias:   this.municipio.indicators.find(i => i.id === -2)?.total ?? 0,
      esterilizados: this.municipio.indicators.find(i => i.id === -3)?.total ?? 0,
      refugios:    this.municipio.indicators.find(i => i.id === -4)?.total ?? 0,
      ninos:       this.municipio.indicators.find(i => i.id === -5)?.total ?? 0,
      emprendedores: this.municipio.indicators.find(i => i.id === -6)?.total ?? 0,
    };
    return map[this.selectedKpiId] ?? 0;
  }
}
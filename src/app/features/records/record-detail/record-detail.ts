import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ComponentModel } from '../../../core/models/component.model';
import { IndicatorModel } from '../../../core/models/indicator.model';
import { RecordModel } from '../../../core/models/record.model';
import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { RecordsService } from '../../../core/services/records.service';
import { StrategiesService } from '../../../core/services/strategy.service';
import { CommonModule } from '@angular/common';
import { ActivitiesService } from '../../../core/services/activities.service';
import { ActivityModel } from '../../../core/models/activity.model';

@Component({
  selector: 'app-record-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './record-detail.html',
  styleUrl: './record-detail.css',
})
export class RecordDetailComponent {

  loading = true;
  record?: RecordModel;

  componentMap: Record<number, string> = {};
  strategyMap: Record<number, string> = {};

  municipios: string[] = [];

  activityMap: Record<number, string> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService,
    private activitiesService: ActivitiesService,
    private strategiesService: StrategiesService
  ) { }

  ngOnInit(): void {
    this.loadMaps();
    this.loadRecord();
  }

  // ===== MAPS =====

  loadMaps() {
    this.componentsService.getAll().subscribe({
      next: (res) => {
        this.componentMap = Object.fromEntries(res.map(c => [c.id, c.name]));
      }
    });

    this.strategiesService.getAll().subscribe({
      next: (res) => {
        this.strategyMap = Object.fromEntries(res.map(s => [s.id, s.name]));
      }
    });

    this.activitiesService.getAll().subscribe({
      next: (res: ActivityModel[]) => {
        this.activityMap = Object.fromEntries(
          res.map(a => [a.id, a.description])
        );
      }
    });

  }

  // ===== RECORD =====
  loadRecord() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.recordsService.getById(id).subscribe({
      next: (res) => {
        this.record = res;

        const municipiosData = res.detalle_poblacion?.municipios || {};
        this.municipios = Object.keys(municipiosData);

        this.loading = false;
      },
      error: () => {
        alert('Registro no encontrado');
        this.loading = false;
      }
    });
  }

  // ==== INDICADORES POR MUNICIPIO (kv → { key, value }) ====
  getIndicadoresForMunicipio(muni: string) {
    if (!this.record) return [];

    const data = this.record.detalle_poblacion?.municipios?.[muni]?.indicadores;

    if (!data) return [];

    return Object.entries(data).map(([key, value]) => ({
      key,
      value
    }));
  }

  back() {
    this.router.navigate(['/records']);
  }
}

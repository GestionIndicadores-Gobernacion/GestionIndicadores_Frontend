import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ComponentModel } from '../../../../core/models/component.model';
import { IndicatorModel } from '../../../../core/models/indicator.model';
import { StrategyModel } from '../../../../core/models/strategy.model';
import { ComponentsService } from '../../../../core/services/components.service';
import { IndicatorsService } from '../../../../core/services/indicators.service';
import { StrategiesService } from '../../../../core/services/strategy.service';

@Component({
  selector: 'app-indicator-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './indicator-detail.html',
  styleUrls: ['./indicator-detail.css'],
})
export class IndicatorDetailComponent {

  indicator?: IndicatorModel;
  loading = true;

  componentMap: Record<number, string> = {};
  strategyMap: Record<number, string> = {};
  componentStrategyMap: Record<number, number> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private indicatorsService: IndicatorsService,
    private componentsService: ComponentsService,
    private strategiesService: StrategiesService
  ) { }

  async ngOnInit() {
    this.loading = true;
    const id = Number(this.route.snapshot.paramMap.get('id'));

    try {
      const [indicator, components, strategies] = await Promise.all([
        firstValueFrom(this.indicatorsService.getById(id)),
        firstValueFrom(this.componentsService.getAll()),
        firstValueFrom(this.strategiesService.getAll()),
      ]);

      // Guardar indicador
      this.indicator = indicator;

      // MAP de componentes
      components.forEach((c: ComponentModel) => {
        this.componentMap[c.id] = c.name;
        this.componentStrategyMap[c.id] = c.activity_id;
      });

      // MAP de estrategias
      strategies.forEach((s: StrategyModel) => {
        this.strategyMap[s.id] = s.name;
      });

    } catch (err) {
      alert('Error cargando los datos del indicador');
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.router.navigate(['/records/indicators']);
  }
}

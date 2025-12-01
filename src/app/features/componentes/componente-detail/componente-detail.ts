import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ComponentModel } from '../../../core/models/component.model';
import { ComponentsService } from '../../../core/services/components.service';
import { StrategyModel } from '../../../core/models/strategy.model';
import { CommonModule } from '@angular/common';
import { StrategiesService } from '../../../core/services/strategy.service';

@Component({
  selector: 'app-componente-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './componente-detail.html',
  styleUrl: './componente-detail.css',
})
export class ComponenteDetailComponent implements OnInit {

  componente?: ComponentModel;
  strategyName?: string;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private componentsService: ComponentsService,
    private strategiesService: StrategiesService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.componentsService.getById(id).subscribe({
      next: (comp) => {
        this.componente = comp;

        // cargar estrategia
        this.strategiesService.getById(comp.strategy_id).subscribe({
          next: (strategy) => {
            this.strategyName = strategy.name;
            this.loading = false;
          },
          error: () => {
            this.strategyName = 'No encontrada';
            this.loading = false;
          }
        });
      },
      error: () => {
        alert('Error cargando componente');
        this.loading = false;
      },
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/components']);
  }
}

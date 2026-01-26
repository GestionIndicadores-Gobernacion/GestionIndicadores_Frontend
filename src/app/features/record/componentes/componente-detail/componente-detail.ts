import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ActivitiesService } from '../../../../core/services/activities.service';
import { ComponentsService } from '../../../../core/services/components.service';
import { StrategiesService } from '../../../../core/services/strategy.service';



@Component({
  selector: 'app-componente-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './componente-detail.html',
})
export class ComponenteDetailComponent implements OnInit {

  componente: any;
  activityName = '';
  strategyName = '';
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private componentsService: ComponentsService,
    private activitiesService: ActivitiesService,
    private strategiesService: StrategiesService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.componentsService.getById(id).subscribe(comp => {
      this.componente = comp;

      this.activitiesService.getById(comp.activity_id).subscribe(activity => {
        this.activityName = activity.description;

        this.strategiesService.getById(activity.strategy_id).subscribe(strategy => {
          this.strategyName = strategy.name;
          this.loading = false;
        });
      });
    });
  }

  goBack() {
    this.router.navigate(['/records/components']);
  }
}

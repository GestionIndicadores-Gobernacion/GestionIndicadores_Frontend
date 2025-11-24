import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IndicatorModel } from '../../../core/models/indicator.model';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-indicator-detail',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './indicator-detail.html',
  styleUrl: './indicator-detail.css',
})
export class IndicatorDetailComponent {
  indicator?: IndicatorModel;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private indicatorsService: IndicatorsService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.indicatorsService.getById(id).subscribe({
      next: (data) => {
        this.indicator = data;
        this.loading = false;
      },
      error: () => {
        alert('Error cargando indicador');
        this.loading = false;
      },
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/indicators']);
  }
}

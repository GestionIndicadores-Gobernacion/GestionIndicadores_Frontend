import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ComponentModel } from '../../../core/models/component.model';
import { IndicatorModel } from '../../../core/models/indicator.model';
import { RecordModel } from '../../../core/models/record.model';
import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { RecordsService } from '../../../core/services/records.service';
import { CommonModule } from '@angular/common';

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
  indicatorMap: Record<number, string> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService
  ) { }

  ngOnInit(): void {
    this.loadMaps();
    this.loadRecord();
  }

  loadMaps() {
    this.componentsService.getAll().subscribe({
      next: (res: ComponentModel[]) => {
        this.componentMap = Object.fromEntries(res.map(c => [c.id, c.name]));
      }
    });

    this.indicatorsService.getAll().subscribe({
      next: (res: IndicatorModel[]) => {
        this.indicatorMap = Object.fromEntries(res.map(i => [i.id, i.name]));
      }
    });
  }

  loadRecord() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.recordsService.getById(id).subscribe({
      next: (res) => {
        this.record = res;
        this.loading = false;
      },
      error: () => {
        alert('Registro no encontrado');
        this.loading = false;
      }
    });
  }

  back() {
    this.router.navigate(['/dashboard/records']);
  }
}

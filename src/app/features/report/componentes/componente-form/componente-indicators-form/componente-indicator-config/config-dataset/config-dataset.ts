import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatasetService } from '../../../../../../../core/services/datasets.service';

@Component({
  selector: 'app-config-dataset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-dataset.html'
})
export class ConfigDatasetComponent implements OnInit {
  @Input() indicatorGroup!: FormGroup;
  @Input() isMulti = false;

  allDatasets: any[] = [];
  loading = false;
  error = '';

  constructor(private datasetService: DatasetService) { }

  ngOnInit(): void {
    this.loading = true;
    this.datasetService.getAll().subscribe({
      next: (datasets) => { this.allDatasets = datasets; this.loading = false; },
      error: () => { this.error = 'Error al cargar datasets'; this.loading = false; }
    });
  }

  get selectedDatasetId(): number | null {
    return this.indicatorGroup.get('configDatasetId')?.value || null;
  }

  get selectedDatasetName(): string {
    return this.allDatasets.find(d => d.id === this.selectedDatasetId)?.name || '';
  }
}
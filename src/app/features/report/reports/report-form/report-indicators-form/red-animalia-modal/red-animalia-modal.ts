import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../../core/models/component.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatasetService } from '../../../../../../core/services/datasets.service';

export interface RedAnimaliaActorEntry {
  actor_id: number;
  actor_name: string;
  actor_type: string;
  metrics: Record<string, number>; // ← AGREGAR
}

export interface RedAnimaliaResult {
  actors: RedAnimaliaActorEntry[];
}

@Component({
  selector: 'app-red-animalia-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './red-animalia-modal.html',
  styleUrl: './red-animalia-modal.css',
})
export class RedAnimaliaModalComponent implements OnChanges {

  @Input() open = false;
  @Input() indicator: ComponentIndicatorModel | null = null;
  @Input() interventionLocation: string | null = null;
  @Input() existing: RedAnimaliaResult | null = null;
  @Input() datasetId: number | null = null;

  @Input() metricTotals: Record<string, number> = {};

  @Output() save = new EventEmitter<RedAnimaliaResult>();
  @Output() close = new EventEmitter<void>();

  actors_added: RedAnimaliaActorEntry[] = [];
  search = '';
  allActors: any[] = [];
  filteredActors: any[] = [];
  loading = false;
  error = '';
  stagingActor: any | null = null;
  editingIndex = -1;
  stagingMetrics: Record<string, number> = {};

  constructor(
    private datasetService: DatasetService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      setTimeout(() => {
        this.initModal();
        this.cdr.detectChanges();
      });
    }
    if (changes['open']?.currentValue === false) {
      this.cdr.detectChanges();
    }
  }

  private initModal(): void {
    this.search = '';
    this.error = '';
    this.loading = true;
    this.stagingActor = null;
    this.editingIndex = -1;

    this.actors_added = this.existing?.actors
      ? JSON.parse(JSON.stringify(this.existing.actors))
        .filter((a: any) => typeof a === 'object' && a !== null && a.actor_id)
      : [];

    const datasetId = this.datasetId ?? this.indicator?.config?.dataset_id;

    if (!datasetId) {
      this.error = 'Este indicador no tiene una base de datos configurada';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.datasetService.getRecordsByDataset(datasetId).subscribe({
      next: (records) => {
        this.allActors = records;
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar actores de la base de datos';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterActors(): void {
    this.applyFilters();
    this.cdr.detectChanges();
  }

  private normalize(s: string): string {
    return s.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  get labelField(): string {
    const subSection = (this.indicator?.config?.sub_sections || [])
      .find((s: any) => s.key === 'red_animalia');
    return subSection?.label_field || 'nombres_y_apellidos';
  }

  get municipioField(): string {
    const subSection = (this.indicator?.config?.sub_sections || [])
      .find((s: any) => s.key === 'red_animalia');
    return subSection?.municipio_field || 'municipio_de_residencia';
  }

  private applyFilters(): void {
    const municipio = this.normalize(this.interventionLocation || '');
    const q = this.normalize(this.search);

    const addedIds = this.actors_added
      .filter((_, i) => i !== this.editingIndex)
      .map(a => a.actor_id);

    let base = municipio
      ? this.allActors.filter(r =>
        this.normalize(r.data?.[this.municipioField] || '').includes(municipio)
      )
      : this.allActors;

    base = base.filter(r => !addedIds.includes(r.id));

    this.filteredActors = q
      ? base.filter(r => this.normalize(r.data?.[this.labelField] || '').includes(q))
      : base;
  }

  selectActorForStaging(actor: any): void {
    this.stagingActor = actor;
    // Inicializa métricas en 0
    this.stagingMetrics = {};
    const metrics = this.indicator?.config?.metrics || [];
    metrics.forEach((m: any) => {
      this.stagingMetrics[m.key] = 0;
    });
    this.cdr.detectChanges();
  }

  // Método para obtener el máximo de una métrica
  getMetricMax(key: string): number {
    return this.metricTotals[key] ?? 0;
  }

  // Método para actualizar valor de métrica en staging
  setStagingMetric(key: string, value: any): void {
    let num = Number(value) || 0;
    const max = this.getMetricMax(key);
    if (num < 0) num = 0;
    if (num > max) num = max;
    this.stagingMetrics[key] = num;
    this.cdr.detectChanges();
  }

  isStagingActorSelected(actor: any): boolean {
    return this.stagingActor?.id === actor.id;
  }

  // Reemplaza commitStaging
  commitStaging(): void {
    if (!this.stagingActor) return;

    const entry: RedAnimaliaActorEntry = {
      actor_id: this.stagingActor.id,
      actor_name: this.stagingActor.data?.[this.labelField] ?? '',
      actor_type: this.stagingActor.data?.['tipo_de_vinculacion_dentro_de_la_red_animalia_valle'] ?? '',
      metrics: { ...this.stagingMetrics },
    };

    if (this.editingIndex >= 0) {
      this.actors_added[this.editingIndex] = entry;
      this.editingIndex = -1;
    } else {
      this.actors_added.push(entry);
    }

    this.stagingActor = null;
    this.stagingMetrics = {};
    this.search = '';
    this.applyFilters();
    this.cdr.detectChanges();
  }


  // Reemplaza editActor
  editActor(index: number): void {
    const entry = this.actors_added[index];
    this.editingIndex = index;
    this.stagingActor = {
      id: entry.actor_id,
      data: {
        [this.labelField]: entry.actor_name,
        tipo_de_vinculacion_dentro_de_la_red_animalia_valle: entry.actor_type
      }
    };
    // Restaura métricas existentes
    this.stagingMetrics = { ...(entry.metrics || {}) };
    this.applyFilters();
    this.cdr.detectChanges();
  }

  removeActor(index: number): void {
    this.actors_added.splice(index, 1);
    if (this.editingIndex === index) {
      this.editingIndex = -1;
      this.stagingActor = null;
    } else if (this.editingIndex > index) {
      this.editingIndex--;
    }
    this.applyFilters();
    this.cdr.detectChanges();
  }

  get canSave(): boolean {
    return this.actors_added.length > 0;
  }

  onSave(): void {
    if (!this.canSave) return;
    this.save.emit({ actors: JSON.parse(JSON.stringify(this.actors_added)) });
  }

  onClose(): void {
    this.close.emit();
  }
}
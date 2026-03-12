import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../../core/models/component.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecordService } from '../../../../../../core/services/record.service';

export interface RedAnimaliaActorEntry {
  actor_id: number;
  actor_name: string;
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

  constructor(
    private recordService: RecordService,
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
      
    this.recordService.getAll(1).subscribe({
      next: (records) => {
        this.allActors = records;
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar actores';
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

  private applyFilters(): void {
    const municipio = this.normalize(this.interventionLocation || '');
    const q = this.normalize(this.search);

    const addedIds = this.actors_added
      .filter((_, i) => i !== this.editingIndex)
      .map(a => a.actor_id);

    let base = municipio
      ? this.allActors.filter(r =>
        this.normalize(r.data?.['municipio'] || '') === municipio
      )
      : this.allActors;

    base = base.filter(r => !addedIds.includes(r.id));

    this.filteredActors = q
      ? base.filter(r => this.normalize(r.data?.['nombre'] || '').includes(q))
      : base;
  }

  selectActorForStaging(actor: any): void {
    this.stagingActor = actor;
    this.cdr.detectChanges();
  }

  isStagingActorSelected(actor: any): boolean {
    return this.stagingActor?.id === actor.id;
  }

  commitStaging(): void {
    if (!this.stagingActor) return;

    const entry: RedAnimaliaActorEntry = {
      actor_id: this.stagingActor.id,
      actor_name: this.stagingActor.data?.['nombre'] ?? '',
    };

    if (this.editingIndex >= 0) {
      this.actors_added[this.editingIndex] = entry;
      this.editingIndex = -1;
    } else {
      this.actors_added.push(entry);
    }

    this.stagingActor = null;
    this.search = '';
    this.applyFilters();
    this.cdr.detectChanges();
  }

  editActor(index: number): void {
    const entry = this.actors_added[index];
    this.editingIndex = index;
    this.stagingActor = { id: entry.actor_id, data: { nombre: entry.actor_name } };
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
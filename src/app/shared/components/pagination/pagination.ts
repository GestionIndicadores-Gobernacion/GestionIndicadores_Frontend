import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  @Input() currentPage = 1;
  @Input() totalPages = 1;

  /** Tamaño de página. Si se pasa junto con totalItems, se muestra el contador "Mostrando X a Y de Z". */
  @Input() pageSize: number | null = null;
  /** Total de ítems sin paginar. Si se pasa junto con pageSize, se muestra el contador. */
  @Input() totalItems: number | null = null;
  /** Etiqueta de dominio para el contador ("usuarios", "datasets", etc.). */
  @Input() itemLabel = 'registros';

  @Output() pageChange = new EventEmitter<number>();

  get showCounter(): boolean {
    return this.pageSize != null && this.totalItems != null && this.totalItems > 0;
  }

  get rangeStart(): number {
    if (!this.showCounter) return 0;
    return (this.currentPage - 1) * (this.pageSize as number) + 1;
  }

  get rangeEnd(): number {
    if (!this.showCounter) return 0;
    return Math.min(this.currentPage * (this.pageSize as number), this.totalItems as number);
  }

  prev() {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  next() {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }
}

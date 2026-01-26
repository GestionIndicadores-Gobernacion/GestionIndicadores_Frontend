import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-select.html',
  styleUrl: './multi-select.css',
})
export class MultiSelectComponent {

  constructor(private elRef: ElementRef) { }

  @Input() items: string[] = [];
  @Input() placeholder: string = "Buscar...";
  @Input() label: string = "";
  @Input() disabled = false;

  @Input() selected: string[] = [];
  @Output() selectedChange = new EventEmitter<string[]>();

  searchTerm = "";
  filteredItems: string[] = [];

  isOpen = false;

  ngOnInit() {
    this.filteredItems = [...this.items];
  }

  // Abrir dropdown
  open(event: Event) {
    if (this.disabled) return;

    event.stopPropagation();
    this.isOpen = true;
    this.filter();
  }

  // Cerrar si hacen click afuera
  @HostListener('document:click', ['$event'])
  closeDropdown(event: Event) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  // Filtrar elementos válidos
  filter() {
    const term = this.searchTerm.toLowerCase();

    this.filteredItems = this.items.filter(i =>
      i.toLowerCase().includes(term) &&
      !this.selected.includes(i)                               // ← CAMBIO
    );
  }

  // Seleccionar elemento
  select(item: string) {
    if (!this.items.includes(item)) return;                    // ← CAMBIO (NO permitir “Bue”)

    this.selected.push(item);
    this.selectedChange.emit(this.selected);

    this.searchTerm = "";
    this.filter();
    this.isOpen = false;                                       // ← CAMBIO (Cerrar dropdown)
  }

  // Eliminar chip
  remove(item: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    this.selected = this.selected.filter(x => x !== item);
    this.selectedChange.emit(this.selected);
    this.filter();
  }

}

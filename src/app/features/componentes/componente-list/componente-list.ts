import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ComponentModel } from '../../../core/models/component.model';
import { ComponentsService } from '../../../core/services/components.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-componente-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './componente-list.html',
  styleUrl: './componente-list.css',
})
export class ComponentesListComponent implements OnInit {

  componentes: ComponentModel[] = [];
  filteredComponents: ComponentModel[] = [];
  loading = true;
  search = '';

  constructor(
    private componentsService: ComponentsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.componentsService.getAll().subscribe({
      next: (res) => {
        this.componentes = res;
        this.filteredComponents = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('Error al cargar los componentes');
      }
    });
  }

  applyFilter() {
    const term = this.search.toLowerCase();
    this.filteredComponents = this.componentes.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.description || '').toLowerCase().includes(term)
    );
  }

  goToCreate() {
    this.router.navigate(['/dashboard/components/create']);
  }

  goToEdit(id: number) {
    this.router.navigate([`/dashboard/components/${id}/edit`]);
  }

  deleteComponent(id: number) {
    if (!confirm('¿Desea eliminar este componente?')) return;

    this.componentsService.delete(id).subscribe({
      next: () => this.load(),
      error: () => alert('Error al eliminar el componente')
    });
  }
}

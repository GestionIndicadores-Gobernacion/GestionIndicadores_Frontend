import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UserModel } from '../../../core/models/user.model';
import { UsersService } from '../../../core/services/users.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users-list.html'
})
export class UsersListComponent implements OnInit {

  Math = Math; // Para usar Math.min en el template

  currentPage = 1;
  pageSize = 10;

  users: UserModel[] = [];
  filteredUsers: UserModel[] = [];
  loading = true;
  search = '';

  sortColumn: keyof UserModel | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private usersService: UsersService,
    private router: Router,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.usersService.getAll().subscribe({
      next: (res) => {
        this.users = res;
        this.filteredUsers = res;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Error cargando usuarios');
        this.loading = false;
      }
    });
  }

  applyFilter() {
    const term = this.search.toLowerCase();

    this.filteredUsers = this.users.filter(u =>
      u.first_name.toLowerCase().includes(term) ||
      u.last_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.role?.name?.toLowerCase().includes(term))
    );

    this.currentPage = 1; // Reset a página 1 al buscar
  }

  get sortedUsers(): UserModel[] {
    if (!this.sortColumn) return this.filteredUsers;

    return [...this.filteredUsers].sort((a: any, b: any) => {
      const valA = (a[this.sortColumn] ?? '').toString().toLowerCase();
      const valB = (b[this.sortColumn] ?? '').toString().toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedUsers(): UserModel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.sortedUsers.length / this.pageSize);
  }

  sortBy(column: keyof UserModel) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  deleteUser(id: number) {
    const user = this.users.find(u => u.id === id);

    // Bloquear eliminación del admin principal
    if (this.isMainAdmin(user!)) {
      this.toast.error("No puedes desactivar el usuario principal de administración.");
      return;
    }

    this.toast.confirm(
      "¿Desactivar usuario?",
      "El usuario ya no podrá acceder al sistema."
    ).then(result => {
      if (!result.isConfirmed) return;

      this.usersService.delete(id).subscribe({
        next: () => {
          this.toast.success("Usuario desactivado correctamente");
          this.loadUsers();
        },
        error: () => {
          this.toast.error("Error al desactivar usuario");
        }
      });
    });
  }

  isMainAdmin(user: UserModel): boolean {
    return user.email === 'admin@gobernacion.gov.co';
  }
}
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserModel } from '../../../core/models/user.model';
import { UsersService } from '../../../core/services/users.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
})
export class UsersListComponent {

  currentPage = 1;
  pageSize = 10;

  users: UserModel[] = [];
  filteredUsers: UserModel[] = [];
  loading = true;
  search = '';

  // ORDENAMIENTO -------------------
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
      error: () => this.loading = false
    });
  }

  applyFilter() {
    const term = this.search.toLowerCase();

    this.filteredUsers = this.users.filter(u =>
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.role?.name?.toLowerCase().includes(term))
    );
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

  goCreate() {
    this.router.navigate(['/users/create']);
  }

  goEdit(id: number) {
    this.router.navigate(['/users', id, 'edit']);
  }
  deleteUser(id: number) {

    const user = this.users.find(u => u.id === id);

    // 🚫 BLOQUEAR ELIMINACIÓN DEL ADMIN PRINCIPAL
    if (user?.email === 'admin@gobernacion.gov.co') {
      this.toast.error("No puedes eliminar el usuario principal de administración.");
      return; // ❗ Se sale y NO sigue con el flujo
    }

    this.toast.confirm(
      "¿Eliminar usuario?",
      "Esta acción no se puede deshacer."
    ).then(result => {

      if (!result.isConfirmed) return;

      this.usersService.delete(id).subscribe({
        next: () => {
          this.toast.success("Usuario eliminado correctamente");
          this.loadUsers();
        },
        error: () => {
          // El interceptor muestra el error exacto}
        }
      });

    });
  }

  isMainAdmin(user: UserModel): boolean {
    return user.email === 'admin@gobernacion.gov.co';
  }


}

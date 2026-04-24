import { Component, DestroyRef, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { UserModel } from '../../../features/user/models/user.model';
import { UsersService } from '../../../features/user/services/users.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageState, PageStateComponent } from '../../../shared/components/page-state/page-state';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, PageStateComponent],
  templateUrl: './users-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersListComponent implements OnInit {

  Math = Math;

  currentPage = 1;
  pageSize = 10;

  users: UserModel[] = [];
  filteredUsers: UserModel[] = [];
  loading = true;
  loadError = false;
  search = '';

  sortColumn: keyof UserModel | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  /** Estado agregado para <app-page-state>. */
  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.loadError) return 'error';
    if (!this.sortedUsers.length) return 'empty';
    return 'content';
  }

  private destroyRef = inject(DestroyRef);

  constructor(
    private usersService: UsersService,
    private router: Router,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.loadError = false;
    this.usersService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.users = res;
          this.filteredUsers = res;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadError = true;
          this.loading = false;
          this.cdr.markForCheck();
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

    this.currentPage = 1;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  deleteUser(id: number) {
    const user = this.users.find(u => u.id === id);

    if (this.isMainAdmin(user!)) {
      this.toast.error("No puedes desactivar el usuario principal de administración.");
      return;
    }

    this.toast.confirm(
      "¿Desactivar usuario?",
      "El usuario ya no podrá acceder al sistema."
    ).then(result => {
      if (!result.isConfirmed) return;

      this.usersService.delete(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
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
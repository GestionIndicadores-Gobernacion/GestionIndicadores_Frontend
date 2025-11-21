import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserModel } from '../../../core/models/user.model';
import { UsersService } from '../../../core/services/users.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  users: UserModel[] = [];
  filteredUsers: UserModel[] = [];
  loading = true;
  search = '';

  constructor(
    private usersService: UsersService,
    private router: Router
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

  goCreate() {
    this.router.navigate(['/dashboard/users/create']);
  }

  goEdit(id: number) {
    this.router.navigate(['/dashboard/users', id, 'edit']);
  }

  deleteUser(id: number) {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;

    this.usersService.delete(id).subscribe({
      next: () => this.loadUsers(),
      error: () => alert('Error eliminando usuario')
    });
  }
}

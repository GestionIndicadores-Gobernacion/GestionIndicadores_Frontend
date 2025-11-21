import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { RolesService } from '../../../core/services/roles.service';
import { UserCreateRequest, UserUpdateRequest } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css'
})
export class UserFormComponent {
  loading = true;
  saving = false;

  isEdit = false;
  userId: number | null = null;

  roles: any[] = [];

  form = {
    name: '',
    email: '',
    password: '',
    role_id: null as number | null
  };

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private usersService: UsersService,
    private rolesService: RolesService
  ) { }

  ngOnInit() {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.userId;

    this.loadRoles();

    if (this.isEdit) this.loadUser();
    else this.loading = false;
  }

  loadRoles() {
    this.rolesService.getAll().subscribe({
      next: res => this.roles = res,
      error: () => alert('Error cargando roles')
    });
  }

  loadUser() {
    this.usersService.getById(this.userId!).subscribe({
      next: (user) => {
        this.form = {
          name: user.name,
          email: user.email,
          password: '',
          role_id: user.role_id
        };
        this.loading = false;
      },
      error: () => {
        alert('Usuario no encontrado');
        this.router.navigate(['/dashboard/users']);
      }
    });
  }

  save() {
    this.saving = true;

    if (this.isEdit) {
      const payload: UserUpdateRequest = {
        name: this.form.name,
        email: this.form.email,
        role_id: this.form.role_id!
      };

      if (this.form.password.trim() !== '') {
        payload.password = this.form.password;
      }

      this.usersService.update(this.userId!, payload).subscribe({
        next: () => this.router.navigate(['/dashboard/users']),
        error: () => this.saving = false
      });

    } else {
      const payload: UserCreateRequest = {
        name: this.form.name,
        email: this.form.email,
        password: this.form.password,
        role_id: this.form.role_id!
      };

      this.usersService.create(payload).subscribe({
        next: () => this.router.navigate(['/dashboard/users']),
        error: () => this.saving = false
      });
    }
  }

  cancel() {
    this.router.navigate(['/dashboard/users']);
  }
}

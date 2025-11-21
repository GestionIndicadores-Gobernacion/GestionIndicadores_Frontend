import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../../../core/services/users.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-detail',
  imports: [
    CommonModule
  ],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
})
export class UserDetailComponent {
  user: any;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private usersService: UsersService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.usersService.getById(id).subscribe(res => {
      this.user = res;
      this.loading = false;
    });
  }
}

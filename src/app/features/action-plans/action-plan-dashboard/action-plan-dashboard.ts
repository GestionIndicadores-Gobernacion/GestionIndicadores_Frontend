import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActionPlanService } from '../../../core/services/action-plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { Pagination } from '../../../shared/components/pagination/pagination';

export interface PlanOwner {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface UserDashboard {
  responsible: string;
  plans_owner: PlanOwner[];
  total_activities: number;
  completed: number;
  pending: number;
  overdue: number;
  total_score: number;
  activities: ActivityDetail[];
  expanded?: boolean;
}

export interface ActivityDetail {
  id: number;
  name: string;
  delivery_date: string;
  status: string;
  score: number | null;
  reported_at: string | null;
  evidence_url: string | null;
}

@Component({
  selector: 'app-action-plan-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Pagination],
  templateUrl: './action-plan-dashboard.html',
})
export class ActionPlanDashboardComponent implements OnInit {

  allUsers: UserDashboard[] = [];
  users: UserDashboard[] = [];
  loading = true;

  search = '';
  statusFilter = '';

  currentPage = 1;
  pageSize = 10;

  sortCol: string = '';
  sortDir: 'asc' | 'desc' = 'asc'

  constructor(
    private actionPlanService: ActionPlanService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.actionPlanService.getDashboard().subscribe({
      next: (data) => {
        this.allUsers = data.map(u => ({ ...u, expanded: false }));
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error cargando dashboard');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    const term = this.search.toLowerCase().trim();
    this.users = this.allUsers.filter(u => {
      const matchSearch = !term ||
        u.responsible.toLowerCase().includes(term) ||
        u.plans_owner.some(o =>
          `${o.first_name} ${o.last_name}`.toLowerCase().includes(term) ||
          o.email.toLowerCase().includes(term)
        );
      const matchStatus = !this.statusFilter ||
        (this.statusFilter === 'completed' && u.completed > 0) ||
        (this.statusFilter === 'overdue' && u.overdue > 0) ||
        (this.statusFilter === 'pending' && u.pending > 0);
      return matchSearch && matchStatus;
    });

    if (this.sortCol) {
      this.users.sort((a, b) => {
        let valA: any;
        let valB: any;
        switch (this.sortCol) {
          case 'responsible': valA = a.responsible.toLowerCase(); valB = b.responsible.toLowerCase(); break;
          case 'total': valA = a.total_activities; valB = b.total_activities; break;
          case 'completed': valA = a.completed; valB = b.completed; break;
          case 'running': valA = a.total_activities - a.completed - a.overdue - a.pending;
            valB = b.total_activities - b.completed - b.overdue - b.pending; break;
          case 'pending': valA = a.pending + a.overdue; valB = b.pending + b.overdue; break;
          case 'completion': valA = this.completionRate(a); valB = this.completionRate(b); break;
          case 'score': valA = a.total_score; valB = b.total_score; break;
          default: return 0;
        }
        return this.sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  sortBy(col: string): void {
    if (this.sortCol === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = col;
      this.sortDir = 'asc';
    }
    this.applyFilters();
  }

  get paginatedUsers(): UserDashboard[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.users.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.users.length / this.pageSize) || 1;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.cdr.detectChanges();
  }

  toggleUser(user: UserDashboard): void {
    user.expanded = !user.expanded;
    this.cdr.detectChanges();
  }

  completionRate(user: UserDashboard): number {
    if (!user.total_activities) return 0;
    return Math.round((user.completed / user.total_activities) * 100);
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      'Realizado': 'bg-emerald-100 text-emerald-700',
      'En Ejecución': 'bg-blue-100 text-blue-700',
      'Pendiente': 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-zinc-100 text-zinc-600';
  }

  roleClass(role: string): string {
    const map: Record<string, string> = {
      'admin': 'bg-orange-100 text-orange-800',
      'editor': 'bg-blue-100 text-blue-800',
      'monitor': 'bg-purple-100 text-purple-800',
      'viewer': 'bg-zinc-100 text-zinc-700',
    };
    return map[role] ?? 'bg-zinc-100 text-zinc-600';
  }
}
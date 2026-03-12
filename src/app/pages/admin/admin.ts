import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { AdminService, AdminUserDto, PageResponse } from '../../services/admin';
import { UserPlan, UserRole } from '../../services/user';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin implements OnInit {
  private adminService = inject(AdminService);
  private title = inject(Title);

  page = signal<PageResponse<AdminUserDto> | null>(null);
  loading = signal(false);
  saving = signal(false);

  emailFilter = '';
  currentPage = 0;
  readonly pageSize = 20;

  // Edit modal
  editingUser = signal<AdminUserDto | null>(null);
  editRole: UserRole = 'ROLE_USER';
  editPlan: UserPlan = 'STANDARD';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.title.setTitle('Administrator — Brief-Fix');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getUsers(this.emailFilter, this.currentPage, this.pageSize).subscribe({
      next: p => { this.page.set(p); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 0;
      this.load();
    }, 350);
  }

  goTo(p: number): void {
    this.currentPage = p;
    this.load();
  }

  openEdit(user: AdminUserDto): void {
    this.editingUser.set(user);
    this.editRole = user.role;
    this.editPlan = user.plan;
  }

  closeEdit(): void {
    this.editingUser.set(null);
  }

  saveEdit(): void {
    const user = this.editingUser();
    if (!user) return;
    this.saving.set(true);
    this.adminService.updateUser(user.id, this.editRole, this.editPlan).subscribe({
      next: updated => {
        // update the row in place
        const current = this.page();
        if (current) {
          this.page.set({
            ...current,
            content: current.content.map(u => u.id === updated.id ? updated : u)
          });
        }
        this.saving.set(false);
        this.closeEdit();
      },
      error: () => this.saving.set(false)
    });
  }

  get totalPages(): number {
    return this.page()?.totalPages ?? 0;
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const cur = this.currentPage;
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(0, cur - delta); i <= Math.min(total - 1, cur + delta); i++) {
      range.push(i);
    }
    return range;
  }

  roleBadgeClass(role: string): string {
    if (role === 'ROLE_ADMIN')   return 'badge badge--admin';
    if (role === 'ROLE_SUPPORT') return 'badge badge--support';
    return 'badge badge--user';
  }

  roleLabel(role: string): string {
    if (role === 'ROLE_ADMIN')   return 'Admin';
    if (role === 'ROLE_SUPPORT') return 'Support';
    return 'User';
  }

  planLabel(plan: string): string {
    return plan === 'PREMIUM' ? 'Premium' : 'Standard';
  }
}

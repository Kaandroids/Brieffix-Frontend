import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss'
})
export class VerifyEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private title = inject(Title);

  status = signal<'loading' | 'success' | 'error'>('loading');

  ngOnInit(): void {
    this.title.setTitle('E-Mail bestätigen — Brief-Fix');
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => this.status.set('success'),
      error: () => this.status.set('error')
    });
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './check-email.html',
  styleUrl: './check-email.scss'
})
export class CheckEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private title = inject(Title);

  email = signal('');
  resendLoading = signal(false);
  resendSuccess = signal(false);
  resendError = signal('');

  ngOnInit(): void {
    this.title.setTitle('E-Mail bestätigen — Brief-Fix');
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
  }

  resend(): void {
    if (!this.email() || this.resendLoading()) return;
    this.resendLoading.set(true);
    this.resendError.set('');
    this.resendSuccess.set(false);

    this.authService.resendVerification(this.email()).subscribe({
      next: () => {
        this.resendLoading.set(false);
        this.resendSuccess.set(true);
      },
      error: () => {
        this.resendLoading.set(false);
        this.resendError.set('E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
      }
    });
  }
}

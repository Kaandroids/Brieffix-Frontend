import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { BgOrbs } from '../../components/bg-orbs/bg-orbs';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BgOrbs],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword implements OnInit {
  private authService = inject(AuthService);
  private route       = inject(ActivatedRoute);

  private token = '';

  form = new FormGroup({
    newPassword:     new FormControl('', [Validators.required, Validators.minLength(8)]),
    confirmPassword: new FormControl('', [Validators.required])
  }, { validators: passwordsMatch });

  loading  = signal(false);
  done     = signal(false);
  error    = signal<string | null>(null);
  invalidToken = signal(false);

  showNew     = signal(false);
  showConfirm = signal(false);

  get newPassword()     { return this.form.get('newPassword')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) this.invalidToken.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token) return;
    this.loading.set(true);
    this.error.set(null);

    this.authService.resetPassword(this.token, this.newPassword.value!).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status;
        this.error.set(
          status === 400
            ? 'Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.'
            : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
        );
      }
    });
  }
}

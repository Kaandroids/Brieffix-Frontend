import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { UserDto, UserService } from '../../services/user';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPw = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return newPw && confirm && newPw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings implements OnInit {
  private userService = inject(UserService);

  user = this.userService.me;

  // ── Profile ──────────────────────────────────────────────────────────────
  profileForm = new FormGroup({
    fullName: new FormControl('', [Validators.required]),
    phone:    new FormControl('')
  });

  profileSaving = signal(false);
  profileSuccess = signal(false);
  profileError   = signal<string | null>(null);

  // ── Password ─────────────────────────────────────────────────────────────
  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword:     new FormControl('', [Validators.required, Validators.minLength(8)]),
    confirmPassword: new FormControl('', [Validators.required])
  }, { validators: passwordsMatch });

  passwordSaving = signal(false);
  passwordSuccess = signal(false);
  passwordError   = signal<string | null>(null);

  // ── Billing ───────────────────────────────────────────────────────────────
  billingForm = new FormGroup({
    billingName:     new FormControl(''),
    billingStreet:   new FormControl(''),
    billingStreetNo: new FormControl(''),
    billingZip:      new FormControl(''),
    billingCity:     new FormControl(''),
    billingCountry:  new FormControl('')
  });

  billingSaving = signal(false);
  billingSuccess = signal(false);
  billingError   = signal<string | null>(null);

  ngOnInit(): void {
    const u = this.user();
    if (u) {
      this.patchForms(u);
    } else {
      this.userService.loadMe().subscribe(u => this.patchForms(u));
    }
  }

  private patchForms(u: UserDto | null): void {
    if (!u) return;
    this.profileForm.patchValue({ fullName: u.fullName, phone: u.phone ?? '' });
    this.billingForm.patchValue({
      billingName:     u.billingName     ?? '',
      billingStreet:   u.billingStreet   ?? '',
      billingStreetNo: u.billingStreetNo ?? '',
      billingZip:      u.billingZip      ?? '',
      billingCity:     u.billingCity     ?? '',
      billingCountry:  u.billingCountry  ?? ''
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.profileSaving.set(true);
    this.profileSuccess.set(false);
    this.profileError.set(null);

    const { fullName, phone } = this.profileForm.value;
    this.userService.updateProfile({ fullName: fullName!, phone: phone || undefined }).subscribe({
      next: () => {
        this.profileSaving.set(false);
        this.profileSuccess.set(true);
        setTimeout(() => this.profileSuccess.set(false), 3000);
      },
      error: (err) => {
        this.profileSaving.set(false);
        this.profileError.set(err?.error?.detail ?? 'Fehler beim Speichern.');
      }
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) return;
    this.passwordSaving.set(true);
    this.passwordSuccess.set(false);
    this.passwordError.set(null);

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.userService.updatePassword({ currentPassword: currentPassword!, newPassword: newPassword! }).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordSuccess.set(true);
        this.passwordForm.reset();
        setTimeout(() => this.passwordSuccess.set(false), 3000);
      },
      error: (err) => {
        this.passwordSaving.set(false);
        this.passwordError.set(err?.error?.detail ?? 'Fehler beim Ändern des Passworts.');
      }
    });
  }

  saveBilling(): void {
    this.billingSaving.set(true);
    this.billingSuccess.set(false);
    this.billingError.set(null);

    this.userService.updateBilling(this.billingForm.value as any).subscribe({
      next: () => {
        this.billingSaving.set(false);
        this.billingSuccess.set(true);
        setTimeout(() => this.billingSuccess.set(false), 3000);
      },
      error: (err) => {
        this.billingSaving.set(false);
        this.billingError.set(err?.error?.detail ?? 'Fehler beim Speichern.');
      }
    });
  }
}

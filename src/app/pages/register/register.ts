import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  name = '';
  email = '';
  busy = false;
  success = false;
  message = '';

  register(): void {
    if (this.busy || !this.name.trim() || !this.email.trim()) return;
    this.busy = true;
    this.message = '';
    this.http.post<{ message: string }>(`${environment.apiUrl}/public/register`, {
      name: this.name.trim(), email: this.email.trim(),
    }).pipe(finalize(() => {
      this.busy = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: result => {
        this.success = true;
        this.message = result.message;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.message = error.status === 429
          ? 'Demasiados intentos. Intenta más tarde.'
          : error.status === 503
          ? 'El registro todavía no está habilitado. Contacta al administrador.'
          : 'No se pudo completar el registro. Intenta más tarde o contacta al administrador.';
        this.changeDetector.markForCheck();
      },
    });
  }
}

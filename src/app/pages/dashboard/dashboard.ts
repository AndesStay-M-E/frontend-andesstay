import { environment } from '../../../environments/environment';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

import {
  decodeAccessToken,
} from '../../auth/token-claims';
import { roleLabel } from '../../shared/labels';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  name = '';
  username = '';
  /** Roles del token (ADMIN, OPERADOR, CLIENTE, AUDITOR): deciden qué módulos se ven. */
  roles: string[] = [];
  /** Scopes del token: se guardan, pero no se muestran al usuario. */
  scopes: string[] = [];
  loadingRoles = true;
  tokenError = '';

  readonly roleName = roleLabel;

  constructor(
    private readonly authService: MsalService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const activeAccount =
      this.authService.instance.getActiveAccount() ??
      this.authService.instance.getAllAccounts()[0];

    if (!activeAccount) {
      this.loadingRoles = false;
      return;
    }

    this.authService.instance.setActiveAccount(activeAccount);

    this.name = activeAccount.name ?? 'Usuario AndesStay';
    this.username = activeAccount.username;

    this.loadAccessTokenClaims();
  }

  hasAnyRole(...allowedRoles: string[]): boolean {
    return allowedRoles.some((role) =>
      this.roles.includes(role),
    );
  }

  private loadAccessTokenClaims(): void {
    const account =
      this.authService.instance.getActiveAccount() ??
      this.authService.instance.getAllAccounts()[0];

    if (!account) {
      this.loadingRoles = false;
      this.tokenError = 'No encontramos una sesión activa. Vuelve a iniciar sesión.';
      return;
    }

    this.authService
      .acquireTokenSilent({
        account,
        scopes: [environment.azure.apiScope],
      })
      .subscribe({
        next: (result) => {
          const claims =
            decodeAccessToken(result.accessToken);

          this.roles =
            claims?.roles ?? [];

          this.scopes =
            claims?.scp
              ? claims.scp.split(' ')
              : [];

          this.tokenError = '';
          this.loadingRoles = false;

          this.changeDetector.detectChanges();
        },

        error: (error: unknown) => {
          console.error(
            'No fue posible obtener el access token:',
            error,
          );

          this.roles = [];
          this.scopes = [];
          this.loadingRoles = false;

          this.tokenError =
            'No pudimos cargar tus permisos. Cierra sesión y vuelve a ingresar.';

          this.changeDetector.detectChanges();
        },
      });
  }

  logout(): void {
    this.authService
      .logoutRedirect({
        postLogoutRedirectUri:
          window.location.origin,
      })
      .subscribe();
  }
}

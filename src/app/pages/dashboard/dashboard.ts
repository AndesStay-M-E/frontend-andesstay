import { environment } from '../../../environments/environment';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

import {
  AdminResponse,
  AuthenticatedUserResponse,
  BffApiService,
} from '../../services/bff-api.service';

interface AndesStayClaims {
  roles?: string[];
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  name = '';
  username = '';
  roles: string[] = [];
  scopes: string[] = [];
  tokenError = '';

  apiUser?: AuthenticatedUserResponse;
  apiMessage = '';
  apiStatus?: number;

  constructor(
    private readonly authService: MsalService,
    private readonly bffApi: BffApiService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const activeAccount =
      this.authService.instance.getActiveAccount() ??
      this.authService.instance.getAllAccounts()[0];

    if (!activeAccount) {
      return;
    }

    this.authService.instance.setActiveAccount(activeAccount);

    this.name = activeAccount.name ?? 'Usuario AndesStay';
    this.username = activeAccount.username;

    const claims = activeAccount.idTokenClaims as AndesStayClaims | undefined;
    this.roles = claims?.roles ?? [];
    this.loadAccessTokenScopes();
  }

  hasAnyRole(...allowedRoles: string[]): boolean {
    return allowedRoles.some((role) => this.roles.includes(role));
  }

  validateToken(): void {
    this.apiMessage = 'Validando token...';
    this.apiStatus = undefined;

    this.bffApi.getCurrentUser().subscribe({
      next: (response: AuthenticatedUserResponse) => {
        this.apiUser = response;
        this.apiStatus = 200;
        this.apiMessage = 'JWT válido: acceso autorizado por el BFF.';
        this.changeDetector.detectChanges();
      },
      error: (error) => {
        this.apiUser = undefined;
        this.apiStatus = error.status;
        this.apiMessage = 'El BFF rechazó la solicitud.';
        this.changeDetector.detectChanges();
      },
    });
  }

  validateAdminAccess(): void {
    this.apiMessage = 'Comprobando rol ADMIN...';
    this.apiStatus = undefined;

    this.bffApi.getAdminStatus().subscribe({
      next: (response: AdminResponse) => {
        this.apiStatus = 200;
        this.apiMessage = response.message;
        this.changeDetector.detectChanges();
      },
      error: (error) => {
        this.apiStatus = error.status;
        this.apiMessage =
          error.status === 403
            ? 'Acceso rechazado: el usuario no posee el rol ADMIN.'
            : `No fue posible validar el acceso. HTTP ${error.status}`;

        this.changeDetector.detectChanges();
      },
    });
  }

  private loadAccessTokenScopes(): void {
  const account =
    this.authService.instance.getActiveAccount() ??
    this.authService.instance.getAllAccounts()[0];

  if (!account) {
    this.tokenError = 'No existe una cuenta activa.';
    return;
  }

  this.authService
    .acquireTokenSilent({
      account,
      scopes: [environment.azure.apiScope],
    })
    .subscribe({
      next: (result) => {
        this.scopes = result.scopes;
        this.tokenError = '';
        this.changeDetector.detectChanges();
      },
      error: (error: unknown) => {
        console.error('No fue posible obtener el access token:', error);

        this.scopes = [];
        this.tokenError =
          'No fue posible obtener los scopes del token.';

        this.changeDetector.detectChanges();
      },
    });
}

  logout(): void {
    this.authService
      .logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      })
      .subscribe();
  }
}
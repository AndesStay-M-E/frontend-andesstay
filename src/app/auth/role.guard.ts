import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router,
} from '@angular/router';

import { MsalService } from '@azure/msal-angular';

import {
  catchError,
  map,
  of,
} from 'rxjs';

import { environment } from '../../environments/environment';

import {
  decodeAccessToken,
} from './token-claims';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(MsalService);
  const router = inject(Router);

  const account =
    authService.instance.getActiveAccount() ??
    authService.instance.getAllAccounts()[0];

  if (!account) {
    return router.createUrlTree(['/login']);
  }

  authService.instance.setActiveAccount(account);

  const requiredRoles =
    route.data['roles'] as string[] | undefined;

  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  return authService
    .acquireTokenSilent({
      account,
      scopes: [environment.azure.apiScope],
    })
    .pipe(
      map((result) => {
        const claims =
          decodeAccessToken(result.accessToken);

        const userRoles =
          claims?.roles ?? [];

        const authorized =
          requiredRoles.some((role) =>
            userRoles.includes(role),
          );

        return authorized
          ? true
          : router.createUrlTree([
              '/unauthorized',
            ]);
      }),

      catchError((error) => {
        console.error(
          'No fue posible validar el rol del access token:',
          error,
        );

        return of(
          router.createUrlTree([
            '/unauthorized',
          ]),
        );
      }),
    );
};
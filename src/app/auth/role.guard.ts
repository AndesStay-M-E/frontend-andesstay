import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

interface AndesStayClaims {
  roles?: string[];
}

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(MsalService);
  const router = inject(Router);

  const account =
    authService.instance.getActiveAccount() ??
    authService.instance.getAllAccounts()[0];

  if (!account) {
    return router.createUrlTree(['/login']);
  }

  const claims = account.idTokenClaims as AndesStayClaims | undefined;
  const userRoles = claims?.roles ?? [];
  const requiredRoles = route.data['roles'] as string[];

  const authorized = requiredRoles.some((role) =>
    userRoles.includes(role),
  );

  return authorized
    ? true
    : router.createUrlTree(['/unauthorized']);
};
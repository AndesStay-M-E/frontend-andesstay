import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { Observable, firstValueFrom, isObservable, of } from 'rxjs';
import { vi } from 'vitest';

import { roleGuard } from './role.guard';

/** Crea un access token falso (header.payload.firma) con los roles indicados. */
function fakeAccessToken(roles: string[]): string {
  const payload = btoa(JSON.stringify({ roles }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `header.${payload}.firma`;
}

describe('roleGuard', () => {
  const getActiveAccount = vi.fn();
  const getAllAccounts = vi.fn();
  const setActiveAccount = vi.fn();
  const acquireTokenSilent = vi.fn();

  const msalServiceMock = {
    instance: {
      getActiveAccount,
      getAllAccounts,
      setActiveAccount,
    },
    acquireTokenSilent,
  };

  const createUrlTree = vi.fn(
    (commands: string[]) =>
      ({ commands }) as unknown as UrlTree,
  );

  const routerMock = {
    createUrlTree,
  };

  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: MsalService,
          useValue: msalServiceMock,
        },
        {
          provide: Router,
          useValue: routerMock,
        },
      ],
    });
  });

  function createRoute(
    requiredRoles: string[],
  ): ActivatedRouteSnapshot {
    return {
      data: {
        roles: requiredRoles,
      },
    } as unknown as ActivatedRouteSnapshot;
  }

  /** El guard puede devolver un valor directo o un Observable. */
  async function runGuard(requiredRoles: string[]): Promise<unknown> {
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRoute(requiredRoles), state),
    );

    return isObservable(result)
      ? firstValueFrom(result as Observable<unknown>)
      : result;
  }

  it('debe permitir el acceso al usuario ADMIN', async () => {
    getActiveAccount.mockReturnValue({ username: 'admin@andesstay.cl' });
    getAllAccounts.mockReturnValue([]);
    acquireTokenSilent.mockReturnValue(
      of({ accessToken: fakeAccessToken(['ADMIN']) }),
    );

    const result = await runGuard(['ADMIN']);

    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('debe rechazar al CLIENTE en una ruta ADMIN', async () => {
    getActiveAccount.mockReturnValue({ username: 'cliente@andesstay.cl' });
    getAllAccounts.mockReturnValue([]);
    acquireTokenSilent.mockReturnValue(
      of({ accessToken: fakeAccessToken(['CLIENTE']) }),
    );

    await runGuard(['ADMIN']);

    expect(createUrlTree).toHaveBeenCalledWith([
      '/unauthorized',
    ]);
  });

  it('debe redirigir al login cuando no existe una cuenta', async () => {
    getActiveAccount.mockReturnValue(null);
    getAllAccounts.mockReturnValue([]);

    await runGuard(['ADMIN']);

    expect(createUrlTree).toHaveBeenCalledWith([
      '/login',
    ]);
  });
});

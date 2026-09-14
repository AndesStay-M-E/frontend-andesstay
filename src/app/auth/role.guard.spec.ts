import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { vi } from 'vitest';

import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  const getActiveAccount = vi.fn();
  const getAllAccounts = vi.fn();

  const msalServiceMock = {
    instance: {
      getActiveAccount,
      getAllAccounts,
    },
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

  it('debe permitir el acceso al usuario ADMIN', () => {
    getActiveAccount.mockReturnValue({
      idTokenClaims: {
        roles: ['ADMIN'],
      },
    });

    getAllAccounts.mockReturnValue([]);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(
        createRoute(['ADMIN']),
        state,
      ),
    );

    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('debe rechazar al CLIENTE en una ruta ADMIN', () => {
    getActiveAccount.mockReturnValue({
      idTokenClaims: {
        roles: ['CLIENTE'],
      },
    });

    getAllAccounts.mockReturnValue([]);

    TestBed.runInInjectionContext(() =>
      roleGuard(
        createRoute(['ADMIN']),
        state,
      ),
    );

    expect(createUrlTree).toHaveBeenCalledWith([
      '/unauthorized',
    ]);
  });

  it('debe redirigir al login cuando no existe una cuenta', () => {
    getActiveAccount.mockReturnValue(null);
    getAllAccounts.mockReturnValue([]);

    TestBed.runInInjectionContext(() =>
      roleGuard(
        createRoute(['ADMIN']),
        state,
      ),
    );

    expect(createUrlTree).toHaveBeenCalledWith([
      '/login',
    ]);
  });
});
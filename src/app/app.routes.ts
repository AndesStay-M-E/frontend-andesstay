import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { roleGuard } from './auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then((component) => component.Login),
  },
  {
    path: 'dashboard',
    canActivate: [MsalGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then(
        (component) => component.Dashboard,
      ),
  },
  {
    path: 'reservations',
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ['ADMIN', 'OPERADOR', 'CLIENTE'],
    },
    loadComponent: () =>
      import('./pages/reservations/reservations').then(
        (component) => component.Reservations,
      ),
  },
  {
    path: 'catalog',
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ['ADMIN', 'OPERADOR'],
    },
    loadComponent: () =>
      import('./pages/catalog/catalog').then(
        (component) => component.Catalog,
      ),
  },
  {
    path: 'reports',
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ['ADMIN'],
    },
    loadComponent: () =>
      import('./pages/reports/reports').then(
        (component) => component.Reports,
      ),
  },
  {
    path: 'audit',
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: ['ADMIN', 'AUDITOR'],
    },
    loadComponent: () =>
      import('./pages/audit/audit').then((component) => component.Audit),
  },
  {
    path: 'unauthorized',
    canActivate: [MsalGuard],
    loadComponent: () =>
      import('./pages/unauthorized/unauthorized').then(
        (component) => component.Unauthorized,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
import {
  BrowserCacheLocation,
  InteractionType,
  IPublicClientApplication,
  PublicClientApplication,
} from '@azure/msal-browser';

import {
  MsalGuardConfiguration,
  MsalInterceptorConfiguration,
} from '@azure/msal-angular';

import { environment } from '../environments/environment';

export function msalInstanceFactory(): IPublicClientApplication {
  // Arquitectura CSR: la aplicación corre completa en el navegador.
  // Se usa el origen actual como redirectUri (http://localhost:4200, la URL
  // de CloudFront o la de Amplify). Ese origen debe estar registrado como
  // "Single-page application" en el App Registration de Azure.
  const origin = window.location.origin;

  return new PublicClientApplication({
    auth: {
      clientId: environment.azure.clientId,
      authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
      redirectUri: origin,
      postLogoutRedirectUri: origin,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
  });
}

export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: [environment.azure.apiScope],
    },
    loginFailedRoute: '/login',
  };
}

export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, string[] | null>();

  // Registration is public: MSAL must not redirect the anonymous caller.
  // Place this specific rule before the protected wildcard.
  protectedResourceMap.set(`${environment.apiUrl}/public/register`, null);

  protectedResourceMap.set(
    `${environment.apiUrl}/*`,
    [environment.azure.apiScope],
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}
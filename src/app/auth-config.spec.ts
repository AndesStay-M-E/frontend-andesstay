import { InteractionType } from '@azure/msal-browser';

import {
  msalGuardConfigFactory,
  msalInterceptorConfigFactory,
} from './auth-config';

import { environment } from '../environments/environment';

describe('Configuración MSAL', () => {
  it('debe solicitar el scope de AndesStay desde el guard', () => {
    const configuration = msalGuardConfigFactory();

    const authRequest = configuration.authRequest as {
      scopes?: string[];
    };

    expect(configuration.interactionType).toBe(
      InteractionType.Redirect,
    );

    expect(authRequest.scopes).toEqual([
      environment.azure.apiScope,
    ]);

    expect(configuration.loginFailedRoute).toBe('/login');
  });

  it('debe adjuntar el token a las llamadas hacia el BFF', () => {
    const configuration = msalInterceptorConfigFactory();

    const protectedUrl = `${environment.apiUrl}/*`;

    expect(
      configuration.protectedResourceMap.has(protectedUrl),
    ).toBe(true);

    expect(
      configuration.protectedResourceMap.get(protectedUrl),
    ).toEqual([environment.azure.apiScope]);
  });

  it('debe utilizar redirección para obtener el token', () => {
    const configuration = msalInterceptorConfigFactory();

    expect(configuration.interactionType).toBe(
      InteractionType.Redirect,
    );
  });
});
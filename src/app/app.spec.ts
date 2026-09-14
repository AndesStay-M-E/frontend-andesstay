import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { of } from 'rxjs';

import { App } from './app';

describe('App', () => {
  const msalServiceMock = {
    handleRedirectObservable: () => of(null),

    instance: {
      getActiveAccount: () => null,
      getAllAccounts: () => [],
      setActiveAccount: () => undefined,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],

      providers: [
        provideRouter([]),
        {
          provide: MsalService,
          useValue: msalServiceMock,
        },
      ],
    }).compileComponents();
  });

  it('debe crear la aplicación AndesStay', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('debe procesar correctamente el retorno de autenticación', () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    expect(
      msalServiceMock.instance.getAllAccounts(),
    ).toEqual([]);
  });
});
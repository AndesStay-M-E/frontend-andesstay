import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthenticationResult } from '@azure/msal-browser';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  constructor(private readonly authService: MsalService) {}

  ngOnInit(): void {
    this.authService.handleRedirectObservable().subscribe({
      next: (result: AuthenticationResult | null) => {
        if (result?.account) {
          this.authService.instance.setActiveAccount(result.account);
          return;
        }

        const accounts = this.authService.instance.getAllAccounts();

        if (
          !this.authService.instance.getActiveAccount() &&
          accounts.length > 0
        ) {
          this.authService.instance.setActiveAccount(accounts[0]);
        }
      },
      error: (error: unknown) => {
        console.error('Error procesando la autenticación:', error);
      },
    });
  }
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  constructor(private readonly authService: MsalService) {}

  login(): void {
    this.authService
      .loginRedirect({
        scopes: [environment.azure.apiScope],
        redirectStartPage: `${window.location.origin}/dashboard`,
      })
      .subscribe();
  }
}

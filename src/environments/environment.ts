export const environment = {
  production: false,

  apiUrl: 'https://8hk6chhmzg.execute-api.us-east-1.amazonaws.com/api',

  azure: {
    clientId: 'c6126dbb-653d-40ae-9c1f-731a504108b6',
    tenantId: '24b1cd18-d18e-4855-bcaf-51ac2db566d5',
    redirectUri: 'http://localhost:4200',
    apiScope:
      'api://c6126dbb-653d-40ae-9c1f-731a504108b6/access_as_user',
  },
};
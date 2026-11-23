// Ambiente de producción (npm run build). Se publica en S3 + CloudFront (CSR).
export const environment = {
  production: true,

  // URL de AWS API Gateway (HTTP API con JWT Authorizer) + "/api".
  // Si creas un API Gateway nuevo, cambia solo esta línea y vuelve a compilar.
  apiUrl: 'https://2cpkx9rhvj.execute-api.us-east-1.amazonaws.com/api',

  azure: {
    clientId: 'bb7e20d0-d275-4c90-b5ec-99f072c756ce',
    tenantId: '4fe52189-087c-4613-8660-500431cc0eb9',
    apiScope: 'api://85237aa5-9ece-48d3-8767-9698df0efefa/access_as_user',
  },
};

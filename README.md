# frontend-andesstay

Frontend de AndesStay hecho en **Angular 22** con login de **Azure AD (MSAL)**.

## Arquitectura CSR (Client-Side Rendering)

La aplicación es una **SPA**: `npm run build` genera solo archivos estáticos (HTML, JS y CSS) y
**todo se dibuja en el navegador**. No hay servidor Node en producción:

```
Navegador ──► CloudFront ──► S3 (index.html + main-xxxx.js + styles-xxxx.css)
    │
    ├──► login.microsoftonline.com   (MSAL: login con redirección, entrega el token JWT)
    └──► API Gateway ──► BFF          (HttpClient + MsalInterceptor agregan "Authorization: Bearer <token>")
```

- El **routing** (`/dashboard`, `/reservations`, `/reports`, ...) lo hace Angular en el navegador.
  Por eso CloudFront (o Amplify) debe devolver `index.html` cuando se pide una ruta que no existe como archivo.
- El `redirectUri` de MSAL es el **origen donde está abierta la app** (`window.location.origin`):
  `http://localhost:4200` en desarrollo y la URL de CloudFront/Amplify en producción. Cada una debe estar
  registrada en Azure como plataforma **Single-page application** (ver la guía de AWS).

## Pantallas

| Ruta | Roles | Qué muestra |
|---|---|---|
| `/dashboard` | todos | Bienvenida, perfil del usuario (Cliente, Recepción, Administrador, Auditor) y menú según el rol |
| `/reservations` | CLIENTE, OPERADOR, ADMIN | Crear, confirmar, cancelar y avanzar reservas (OPERADOR y ADMIN ven todas) |
| `/catalog` | OPERADOR, ADMIN | Alojamientos, precios y tickets de limpieza (se crean solos al confirmar y al hacer checkout) |
| `/reports` | ADMIN | **Indicadores en tiempo real** (se actualizan cada 5 s), gráficos, última actividad, vouchers y boletas |
| `/audit` | ADMIN, AUDITOR | Historial de cambios: quién, rol, cuándo y desde qué IP; filtros por reserva, estado, correo y fecha |

> La interfaz está pensada para el cliente final: no muestra tópicos, colas, particiones, offsets ni traceId.
> Esos datos se revisan en Kafka UI, en la consola de RabbitMQ y con `ms-andesstay-kafka-admin`.

## Desarrollo

Requisitos: Node.js 22 y el backend levantado (`infra-andesstay-messaging`, BFF en `http://localhost:8080`).

```powershell
npm install
npm start            # http://localhost:4200
npm test             # pruebas con Vitest
```

## Build de producción

```powershell
npm run build        # usa src/environments/environment.production.ts
```

Los archivos quedan en **`dist/frontend-andesstay/browser/`**: eso es lo que se sube a S3.

La URL de la API está en `src/environments/environment.production.ts` (`apiUrl`). Si se crea un API Gateway
nuevo, se cambia esa línea y se vuelve a compilar.

El paso a paso completo (S3 + CloudFront o Amplify, Azure y API Gateway) está en
`infra-andesstay-messaging/docs/GUIA-DESPLIEGUE-AWS-CSR.md`.

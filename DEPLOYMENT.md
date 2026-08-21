# Production Deployment Checklist

KARJALAN runs as a Vite frontend and an Express/Prisma backend. In a decoupled deployment, Cloudflare serves the frontend and Render/Railway (or another Node host) serves the API.

## Backend environment variables

Set these as secrets on the backend service:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/karjalan?schema=public
JWT_SECRET=<at least 32 random characters>
FACEIT_API_KEY=<server-side FACEIT API key>
FACEIT_WEBHOOK_SECRET=<FACEIT webhook secret, if webhooks are enabled>
CORS_ORIGIN=https://<your-cloudflare-frontend-domain>
NODE_ENV=production
PORT=<provided by the hosting service, usually 10000 or $PORT>
```

`FACEIT_API_KEY`, `JWT_SECRET`, and `DATABASE_URL` must never be exposed as `VITE_` variables or committed to the repository. `CORS_ORIGIN` accepts comma-separated origins when more than one frontend domain is required.

## PostgreSQL setup

Prisma cannot read the datasource provider from an environment variable. Local development remains SQLite:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Before the first production deploy, change `provider` to `postgresql`, set the PostgreSQL `DATABASE_URL`, and create/apply a migration from the schema:

```powershell
# Run after changing provider to postgresql and pointing DATABASE_URL at PostgreSQL
npx prisma migrate dev --name initial_postgres
```

Commit the generated `prisma/migrations` directory. On Render/Railway, run this as the deploy/release step:

```powershell
npm run db:migrate:deploy
```

Do not run `prisma db push --force-reset` against a production database.

## Cloudflare frontend variables

Set this build-time variable in Cloudflare:

```text
VITE_API_BASE_URL=https://<your-render-or-railway-backend-domain>
```

The frontend routes all API requests through this value. Keep the value without a trailing slash. For local same-origin development, leave it empty and the frontend uses relative `/api/...` paths.

Cloudflare build settings:

```text
Build command: npm run build
Output directory: dist
Production branch: main
```

If the frontend and backend use different domains, the backend must use the exact Cloudflare origin in `CORS_ORIGIN`, and production auth cookies require HTTPS. Deploy the backend first, then set its URL as `VITE_API_BASE_URL` in Cloudflare and redeploy the frontend.

## Verification

```powershell
npm ci
npm run lint
npm run build
npm run db:migrate:deploy
```

Check the browser Network panel for API requests going to the backend domain, and verify that login sets an HTTP-only cookie and that authenticated requests include credentials.

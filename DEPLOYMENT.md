# Production Deployment Checklist

KARJALAN runs as a Vite frontend and an Express/Prisma backend. In a decoupled deployment, Cloudflare serves the frontend and Render/Railway (or another Node host) serves the API.

## Backend environment variables

Set these as secrets on the backend service:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/karjalan?schema=public
JWT_SECRET=<at least 32 random characters>
FACEIT_API_KEY=<server-side FACEIT API key>
DISCORD_CLIENT_ID=<Discord application client ID>
DISCORD_CLIENT_SECRET=<Discord application client secret>
DISCORD_REDIRECT_URI=https://<your-render-service>.onrender.com/api/discord/callback
DISCORD_BOT_TOKEN=<server-side Discord bot token>
DISCORD_GUILD_ID=<Karjalan Discord server ID>
DISCORD_PLAYER_ROLE_ID=<Player role ID>
DISCORD_TOURNAMENT_WEBHOOK_URL=<webhook URL for #imoitukset>
DISCORD_TOURNAMENT_ANNOUNCEMENT_WEBHOOK_URL=<webhook URL for tournament forum>
FRONTEND_URL=https://karjalan.net
CORS_ORIGIN=https://karjalan.net
NODE_ENV=production
PORT=<provided by the hosting service, usually 10000 or $PORT>
```

`FACEIT_API_KEY`, `JWT_SECRET`, `DATABASE_URL`, Discord client secret, bot token, and webhook URL must never be exposed as `VITE_` variables or committed to the repository. `CORS_ORIGIN` accepts comma-separated origins when more than one frontend domain is required.

Create a Discord application and bot, enable the bot's **Manage Roles** permission, and move its highest role above the Player role. Add `DISCORD_REDIRECT_URI` exactly to the Discord application's OAuth2 redirect URI list. The OAuth flow requests `identify` and `guilds.join`; the bot must be a member of `DISCORD_GUILD_ID`. In the Karjalan server, create a text channel named `#imoitukset`. In its permissions, allow `@everyone` to view the channel and read message history, and deny `Send Messages`; remove any role-specific `Send Messages` allows for members who should not post. Administrators can still post because Discord's Administrator permission bypasses channel overwrites. Create a webhook in `#imoitukset` and set its URL as the backend-only `DISCORD_TOURNAMENT_WEBHOOK_URL` secret. Create a second webhook targeting a Discord Forum channel and set it as `DISCORD_TOURNAMENT_ANNOUNCEMENT_WEBHOOK_URL`; the site creates a forum post named after the tournament and publishes the same embed to both destinations. Both requests run independently, so a failure to one does not prevent the other.

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

Set this required build-time variable in Cloudflare to the public Render service URL:

```text
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
```

The frontend routes all production API requests through this value; a production build without it fails API calls with an explicit configuration error instead of silently using relative `/api/...` paths. Keep the value without a trailing slash. Local development may leave it empty to use the Vite/Express same-origin proxy.

Cloudflare build settings:

```text
Build command: npm run build
Output directory: dist
Production branch: main
```

The backend explicitly allows `https://karjalan.net` and, outside production, `http://localhost:5173` and `http://localhost:3000`. Additional origins can be added with comma-separated `CORS_ORIGIN` values. Production auth cookies require HTTPS. Deploy the backend first, then set its URL as `VITE_API_BASE_URL` in Cloudflare and redeploy the frontend.

## Render service commands

Use the following commands for the Render Node web service:

```text
Build command: npm ci && npm run build
Start command: npm run server
```

`npm run build:server` bundles only the Express server; `npm run build:client` builds only the Vite frontend. `npm run build` prepares Prisma and builds both artifacts.

Before deploying the backend, add the nullable `User.discordId` column and unique index to the production database. This repository has no committed Prisma migration history, so apply the additive schema change against the configured production `DATABASE_URL` with `npx prisma db push`; do not run it with `--accept-data-loss` or `--force-reset`. Once a migration baseline is established, prefer committed migrations for future production schema changes.

## Verification

```powershell
npm ci
npm run lint
npm run build
npm run db:migrate:deploy
```

Check the browser Network panel for API requests going to the backend domain, and verify that login sets an HTTP-only cookie and that authenticated requests include credentials.

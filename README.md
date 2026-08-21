# KARJALAN - CS2 Tournament Platform

**Karjalan** on Suomalaisen CS2-kilpapelaamisen koti. The platform is built as a scalable, portable full-stack Node.js + React + Prisma application.

## Portable Architecture

This project is specifically designed to be easily exported from Google AI Studio and run in any standard development environment (like VS Code) or deployed to any production hosting provider.

### Tech Stack
*   **Frontend**: React, TypeScript, Tailwind CSS, Vite.
*   **Backend**: Node.js, Express, TypeScript.
*   **Database**: SQLite for local preview, fully compatible with **PostgreSQL** in production.
*   **ORM**: Prisma.
*   **Authentication**: JWT & bcrypt (Local authentication independent of AI Studio).
*   **Integrations**: FACEIT API Adapter.

## How to run locally (VS Code)

1. **Clone the repository / Extract the zip.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up Environment Variables:**
   Copy `.env.example` to `.env` and configure your local settings.
   ```bash
   cp .env.example .env
   ```
4. **Initialize the Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```
5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The backend server will run on `http://localhost:3000` and Vite will serve the frontend.

## Moving to Production

When moving to a production environment (like AWS, Render, Heroku, or VPS):

1. **Change the Database to PostgreSQL:**
   In `prisma/schema.prisma`, change the provider:
   ```prisma
   datasource db {
     provider = "postgresql" // Changed from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. **Update your `.env` file** with the production PostgreSQL `DATABASE_URL` and `FACEIT_API_KEY`.
3. **Set `FACEIT_MOCK_MODE=false`** to connect to the real FACEIT API.
4. **Create a production build:**
   ```bash
   npm run build
   ```
5. **Start the production server:**
   ```bash
   npm start
   ```

## FACEIT Integration
Karjalan has a built-in isolated abstraction for FACEIT (`server/integrations/faceit/`). 
In development, it defaults to `FACEIT_MOCK_MODE=true`, which simulates FACEIT tournaments locally. Once you have an official API key from the [FACEIT Developer Portal](https://developers.faceit.com/), you can switch to production mode without changing frontend code.

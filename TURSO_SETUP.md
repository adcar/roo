# Turso Database Setup Guide

This project uses [Turso](https://turso.tech) (libSQL) for database storage, which is compatible with SQLite and works perfectly on Vercel.

## Setup Instructions

### 1. Create a Turso Account and Database

1. Go to [https://turso.tech](https://turso.tech) and sign up
2. Create a new database
3. Copy your database URL (it will look like `libsql://your-db-name.turso.io`)

### 2. Create an Auth Token

1. In the Turso dashboard, go to your database
2. Click on "Tokens" or "Auth"
3. Create a new token
4. Copy the token (you'll only see it once!)

### 3. Set Environment Variables

#### For Local Development

Create a `.env.local` file in the root of the project:

```env
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
```

#### For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following:
   - `TURSO_DATABASE_URL` = your database URL
   - `TURSO_AUTH_TOKEN` = your auth token

### 4. Initialize the Database Schema

The tables will be **automatically created** when you first use the app - no manual migration needed! The app creates the necessary tables (`programs`, `workout_logs`, `custom_exercises`) on first database connection.

If you need to run migrations manually, you can use the Turso CLI:
```bash
# Install Turso CLI (if not already installed)
curl -sSfL https://get.tur.so/install.sh | bash

# Run SQL migrations
turso db shell your-database-name < migrations.sql
```

## Migration from SQLite

If you were previously using SQLite locally, your data won't automatically migrate. You'll need to:

1. Export your data from the old SQLite database
2. Import it into Turso using the Turso CLI or dashboard

Alternatively, you can start fresh with Turso - the app will create empty tables automatically.

## Troubleshooting

- **"TURSO_DATABASE_URL environment variable is not set"**: Make sure you've set the environment variables in `.env.local` (local) or Vercel settings (production)
- **Connection errors**: Verify your database URL and auth token are correct
- **Table creation errors**: The tables are created automatically on first use, but you can manually run `pnpm drizzle-kit push` if needed


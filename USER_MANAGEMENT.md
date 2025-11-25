# User Management Guide

This guide explains how to manually add users to your Turso database for Better Auth.

## Prerequisites

- Turso database set up with Better Auth tables created
- Environment variables configured (`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`)

## Method 1: Using the Add User Script (Recommended)

We've provided a script that handles password hashing and user creation automatically.

### Install Dependencies

```bash
pnpm install
```

### Add a User

```bash
pnpm tsx scripts/add-user.ts <username> <password> [email]
```

**Examples:**

```bash
# Add user with username and password (email will be auto-generated)
pnpm tsx scripts/add-user.ts john "securepassword123"

# Add user with custom email
pnpm tsx scripts/add-user.ts john "securepassword123" john@example.com
```

The script will:
- Generate a unique user ID
- Hash the password using bcrypt (as required by Better Auth)
- Create the user record in the `user` table
- Create the account record in the `account` table
- Display the created user information

## Method 2: Using Turso CLI

If you prefer to use SQL directly, you can use the Turso CLI:

### 1. Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### 2. Connect to Your Database

```bash
turso db shell <your-database-name>
```

### 3. Hash Your Password

You'll need to hash the password using bcrypt. You can use Node.js:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(hash => console.log(hash));"
```

### 4. Insert User Records

```sql
-- Generate a UUID for the user (you can use an online UUID generator)
-- Replace the values below with your actual data

-- Insert user
INSERT INTO user (id, email, username, createdAt, updatedAt, emailVerified)
VALUES (
  'your-user-id-uuid',
  'user@example.com',  -- Email (required, can be placeholder)
  'username',           -- Username (unique)
  strftime('%s', 'now') * 1000,  -- Current timestamp in milliseconds
  strftime('%s', 'now') * 1000,
  1  -- emailVerified (1 = true)
);

-- Insert account (for password authentication)
INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt)
VALUES (
  'your-account-id-uuid',
  'user@example.com',  -- Same as email
  'credential',        -- Provider ID for email/password auth
  'your-user-id-uuid', -- Same as user.id above
  '$2a$10$hashedpasswordhere...',  -- Bcrypt hashed password
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);
```

## Method 3: Using a Node.js Script

You can also create a custom script:

```typescript
import { createClient } from '@libsql/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function createUser(username: string, password: string, email?: string) {
  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = Date.now();
  const userEmail = email || `${username}@workout.local`;

  await client.execute({
    sql: `INSERT INTO user (id, email, username, createdAt, updatedAt, emailVerified)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [userId, userEmail, username, now, now, 1],
  });

  await client.execute({
    sql: `INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [accountId, userEmail, 'credential', userId, hashedPassword, now, now],
  });

  console.log(`User ${username} created successfully!`);
}

// Usage
createUser('myusername', 'mypassword', 'user@example.com');
```

## Database Schema Reference

### User Table
- `id` (TEXT, PRIMARY KEY): Unique user identifier (UUID)
- `email` (TEXT, NOT NULL, UNIQUE): User email (required by Better Auth)
- `username` (TEXT, UNIQUE): Username for login
- `createdAt` (INTEGER): Timestamp in milliseconds
- `updatedAt` (INTEGER): Timestamp in milliseconds
- `emailVerified` (INTEGER): 1 for true, 0 for false

### Account Table
- `id` (TEXT, PRIMARY KEY): Unique account identifier (UUID)
- `accountId` (TEXT, NOT NULL): Usually the email
- `providerId` (TEXT, NOT NULL): 'credential' for email/password auth
- `userId` (TEXT, NOT NULL): Foreign key to user.id
- `password` (TEXT): Bcrypt hashed password
- `createdAt` (INTEGER): Timestamp in milliseconds
- `updatedAt` (INTEGER): Timestamp in milliseconds

## Troubleshooting

### "UNIQUE constraint failed"
- Username or email already exists
- Choose a different username or email

### "Foreign key constraint failed"
- Make sure the `userId` in the account table matches the `id` in the user table

### Password not working
- Ensure password is hashed with bcrypt (10 rounds)
- Verify the password hash is stored correctly in the account table
- Check that `providerId` is set to 'credential'

## Security Notes

- Never store plain text passwords
- Always use bcrypt with at least 10 rounds
- Keep your Turso auth token secure
- Consider using environment variables for sensitive data


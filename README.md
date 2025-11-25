# 🦘 ’Roo

A Next.js workout tracking application with support for custom programs and Week A/B splits.

## Features

- **Exercise Library**: Browse 800+ exercises with detailed instructions and images from the [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
- **Custom Programs**: Create workout programs with multiple days (e.g., Leg Day, Pull Day, Chest Day)
- **Week A/B Splits**: Each day supports different exercises for Week A and Week B
- **Exercise Configuration**: Set custom sets, reps, and weight for each exercise
- **Workout Sessions**: Interactive workout mode to track your progress through exercises
- **Analytics**: Track your progress with detailed analytics and charts
- **Database**: Uses Turso (libSQL) for reliable data storage, works perfectly on Vercel

## Getting Started

### Prerequisites

1. **Set up Turso Database** (required for data persistence):
   - Create a free account at [Turso](https://turso.tech)
   - Create a new database
   - Get your database URL and auth token
   - See [TURSO_SETUP.md](./TURSO_SETUP.md) for detailed instructions

2. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   TURSO_DATABASE_URL=libsql://your-database-name.turso.io
   TURSO_AUTH_TOKEN=your-auth-token-here
   ```

3. **Install Dependencies**:
   ```bash
   pnpm install
   ```

4. **Run the Development Server**:
   ```bash
   pnpm dev
   # or
   npm run dev
   # or
   yarn dev
   ```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the application.

## Project Structure

- `/app` - Next.js app router pages
- `/components` - Reusable React components
- `/types` - TypeScript type definitions
- `/lib` - Utility functions and storage logic
- `/hooks` - Custom React hooks
- `/public` - Static assets including exercise data and images

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This app is ready to deploy on Vercel! Follow these steps:

1. **Push your code to GitHub** (already done ✅)

2. **Set up Turso Database** (if not already done):
   - See [TURSO_SETUP.md](./TURSO_SETUP.md) for instructions

3. **Deploy to Vercel**:
   - Import your GitHub repository in [Vercel](https://vercel.com)
   - Add environment variables in Vercel project settings:
     - `TURSO_DATABASE_URL` = your Turso database URL
     - `TURSO_AUTH_TOKEN` = your Turso auth token
   - Deploy!

The app uses Turso (libSQL) which is fully compatible with Vercel's serverless functions. Your data will persist across deployments.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# 🦘 'Roo

A Next.js workout tracking application with support for custom programs and Week A/B splits.

## Features

- **Exercise Library**: Browse 800+ exercises with detailed instructions and images from the [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
- **Custom Programs**: Create workout programs with multiple days (e.g., Leg Day, Pull Day, Chest Day)
- **Week A/B Splits**: Each day supports different exercises for Week A and Week B
- **Exercise Configuration**: Set custom sets, reps, and weight for each exercise
- **Workout Sessions**: Interactive workout mode to track your progress through exercises
- **Local Storage**: All programs are saved locally in your browser

## Getting Started

First, run the development server:

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

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

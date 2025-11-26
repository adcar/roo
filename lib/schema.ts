import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const programs = sqliteTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  days: text('days').notNull(), // JSON string
  isSplit: integer('is_split'), // 1 for true, 0 for false, null for undefined (defaults to true for backward compatibility)
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  userId: text('user_id').notNull(), // User who owns this program
});

export const workoutLogs = sqliteTable('workout_logs', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull(),
  dayId: text('day_id').notNull(),
  week: text('week').notNull(), // 'A' or 'B'
  date: text('date').notNull(),
  exercises: text('exercises').notNull(), // JSON string
  userId: text('user_id').notNull(), // User who owns this log
});

export const customExercises = sqliteTable('custom_exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  primaryMuscles: text('primary_muscles').notNull(), // JSON string
  secondaryMuscles: text('secondary_muscles').notNull(), // JSON string
  level: text('level'),
  category: text('category'),
  equipment: text('equipment'),
  instructions: text('instructions'),
  images: text('images').notNull(), // JSON string
  isCustom: integer('is_custom').default(1),
  userId: text('user_id').notNull(), // User who owns this exercise
});

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id').primaryKey(), // User ID (references user.id)
  weekMapping: text('week_mapping').notNull().default('oddA'), // 'oddA' or 'oddB'
  inspirationQuote: text('inspiration_quote'), // Optional inspiration quote for leaderboard
  updatedAt: text('updated_at').notNull(),
});

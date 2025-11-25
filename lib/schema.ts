import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const programs = sqliteTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  days: text('days').notNull(), // JSON string
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const workoutLogs = sqliteTable('workout_logs', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull(),
  dayId: text('day_id').notNull(),
  week: text('week').notNull(), // 'A' or 'B'
  date: text('date').notNull(),
  exercises: text('exercises').notNull(), // JSON string
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
});

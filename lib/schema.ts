import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

// ---- Programs & Workouts ----

export const programs = sqliteTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  days: text('days').notNull(),
  isSplit: integer('is_split'),
  durationWeeks: integer('duration_weeks'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  userId: text('user_id').notNull(),
});

export const workoutLogs = sqliteTable('workout_logs', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull(),
  dayId: text('day_id').notNull(),
  week: text('week').notNull(),
  date: text('date').notNull(),
  exercises: text('exercises').notNull(),
  userId: text('user_id').notNull(),
});

export const workoutProgress = sqliteTable('workout_progress', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull(),
  dayId: text('day_id').notNull(),
  week: text('week').notNull(),
  currentExerciseIndex: integer('current_exercise_index').notNull(),
  exercises: text('exercises').notNull(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const workoutNotes = sqliteTable('workout_notes', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull(),
  dayId: text('day_id').notNull(),
  week: text('week').notNull(),
  exerciseId: text('exercise_id').notNull(),
  notes: text('notes'),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ---- Custom Exercises ----

export const customExercises = sqliteTable('custom_exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  primaryMuscles: text('primary_muscles').notNull(),
  secondaryMuscles: text('secondary_muscles').notNull(),
  level: text('level'),
  category: text('category'),
  equipment: text('equipment'),
  instructions: text('instructions'),
  images: text('images').notNull(),
  isCustom: integer('is_custom').default(1),
  userId: text('user_id').notNull(),
});

// ---- User Settings ----

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id').primaryKey(),
  weekMapping: text('week_mapping').notNull().default('oddA'),
  inspirationQuote: text('inspiration_quote'),
  availableEquipment: text('available_equipment'),
  weight: text('weight'),
  height: text('height'),
  bodyfatPercentage: text('bodyfat_percentage'),
  gender: integer('gender'),
  age: integer('age'),
  updatedAt: text('updated_at').notNull(),
});

// ---- Nutrition tables (kept for DB compatibility, not used in this app) ----

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  productData: text('product_data').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const foodTemplates = sqliteTable('food_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  items: text('items').notNull(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const foodLogEntries = sqliteTable('food_log_entries', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const foodLogItems = sqliteTable('food_log_items', {
  id: text('id').primaryKey(),
  logEntryId: text('log_entry_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: text('quantity').notNull(),
  mealType: text('meal_type'),
  createdAt: text('created_at').notNull(),
});

export const userFoods = sqliteTable('user_foods', {
  userId: text('user_id').notNull(),
  productId: text('product_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.productId] }),
}));

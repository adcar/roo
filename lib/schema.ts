import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const programs = sqliteTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  days: text('days').notNull(), // JSON string
  isSplit: integer('is_split'), // 1 for true, 0 for false, null for undefined (defaults to true for backward compatibility)
  durationWeeks: integer('duration_weeks'), // Optional duration in weeks. If null, program duration is unlimited
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

export const workoutProgress = sqliteTable('workout_progress', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull(),
  dayId: text('day_id').notNull(),
  week: text('week').notNull(), // 'A' or 'B'
  currentExerciseIndex: integer('current_exercise_index').notNull(),
  exercises: text('exercises').notNull(), // JSON string
  userId: text('user_id').notNull(), // User who owns this progress
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
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
  availableEquipment: text('available_equipment'), // JSON string array of available equipment
  weight: text('weight'), // Weight in kg or lbs (stored as string to allow units)
  height: text('height'), // Height in cm or inches (stored as string to allow units)
  bodyfatPercentage: text('bodyfat_percentage'), // Body fat percentage (optional)
  gender: integer('gender'), // 0 for female, 1 for male, null for not specified
  age: integer('age'), // Age in years (optional)
  updatedAt: text('updated_at').notNull(),
});

// Products table - stores all OpenFoodFacts product data
export const products = sqliteTable('products', {
  id: text('id').primaryKey(), // Barcode
  productData: text('product_data').notNull(), // JSON string containing full product data from OpenFoodFacts
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Food templates - user-created templates for frequently eaten foods
export const foodTemplates = sqliteTable('food_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  items: text('items').notNull(), // JSON string array of template items
  userId: text('user_id').notNull(), // User who owns this template
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Food log entries - daily food diary entries
export const foodLogEntries = sqliteTable('food_log_entries', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD format
  userId: text('user_id').notNull(), // User who owns this log entry
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Food log items - individual food items in a log entry
export const foodLogItems = sqliteTable('food_log_items', {
  id: text('id').primaryKey(),
  logEntryId: text('log_entry_id').notNull(), // References food_log_entries.id
  productId: text('product_id').notNull(), // References products.id (barcode)
  quantity: text('quantity').notNull(), // Amount consumed (e.g., "100g", "1 piece")
  mealType: text('meal_type'), // Optional: "breakfast", "lunch", "dinner", "snack"
  createdAt: text('created_at').notNull(),
});

// User foods - foods the user wants to keep in their "My Foods" list
// This is independent of food log entries, so deleting from logs doesn't remove from this list
export const userFoods = sqliteTable('user_foods', {
  userId: text('user_id').notNull(), // User who owns this food
  productId: text('product_id').notNull(), // References products.id (barcode)
  createdAt: text('created_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.productId] }),
}));

export const workoutNotes = sqliteTable('workout_notes', {
  id: text('id').primaryKey(),
  programId: text('program_id').notNull(),
  dayId: text('day_id').notNull(),
  week: text('week').notNull(), // 'A' or 'B'
  notes: text('notes'), // User's custom notes for this workout
  userId: text('user_id').notNull(), // User who owns these notes
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

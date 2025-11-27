import { getDb } from '../lib/db';

async function initNutritionTables() {
  console.log('Initializing nutrition tables...');
  try {
    // Just calling getDb() will trigger table creation
    await getDb();
    console.log('✅ Nutrition tables initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing tables:', error);
    process.exit(1);
  }
}

initNutritionTables();

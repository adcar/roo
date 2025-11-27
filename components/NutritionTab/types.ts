export interface FoodTemplateItem {
  productId: string;
  quantity: string;
  mealType?: string;
}

export interface FoodTemplate {
  id: string;
  name: string;
  items: FoodTemplateItem[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodLogItem {
  id: string;
  logEntryId: string;
  productId: string;
  quantity: string;
  mealType?: string;
  createdAt: string;
  product?: any; // OpenFoodFacts product data
}

export interface FoodLogEntry {
  id: string;
  date: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodLogData {
  entry: FoodLogEntry | null;
  items: FoodLogItem[];
}


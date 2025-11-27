/**
 * OpenFoodFacts API Client
 * 
 * Automatically detects production vs staging environment based on NODE_ENV
 * Production: https://world.openfoodfacts.org
 * Staging: https://world.openfoodfacts.net (requires basic auth)
 */

const PRODUCTION_API_URL = 'https://world.openfoodfacts.org';
const STAGING_API_URL = 'https://world.openfoodfacts.net';

// User-Agent format: AppName/Version (ContactEmail)
const USER_AGENT = 'WorkoutApp/1.0 (workout@example.com)';

function getApiBaseUrl(): string {
  // Use staging in development, production otherwise
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? STAGING_API_URL : PRODUCTION_API_URL;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'User-Agent': USER_AGENT,
  };

  // Staging requires basic auth
  if (process.env.NODE_ENV === 'development') {
    const auth = Buffer.from('off:off').toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }

  return headers;
}

export interface OpenFoodFactsProduct {
  code: string; // Barcode
  status: number;
  status_verbose: string;
  product?: {
    _id?: string;
    code?: string;
    product_name?: string;
    product_name_en?: string;
    brands?: string;
    categories?: string;
    categories_tags?: string[];
    nutriments?: {
      energy_kcal_100g?: number;
      energy_kcal_value?: number;
      proteins_100g?: number;
      proteins_value?: number;
      carbohydrates_100g?: number;
      carbohydrates_value?: number;
      fat_100g?: number;
      fat_value?: number;
      fiber_100g?: number;
      fiber_value?: number;
      sugars_100g?: number;
      sugars_value?: number;
      salt_100g?: number;
      salt_value?: number;
      sodium_100g?: number;
      sodium_value?: number;
      [key: string]: any;
    };
    nutriscore_grade?: string;
    nova_group?: number;
    additives_tags?: string[];
    allergens_tags?: string[];
    ingredients_text?: string;
    ingredients_text_en?: string;
    image_url?: string;
    image_front_url?: string;
    image_nutrition_url?: string;
    image_ingredients_url?: string;
    serving_size?: string;
    serving_quantity?: number;
    serving_quantity_unit?: string;
    [key: string]: any; // Store all fields for future use
  };
}

export interface SearchResult {
  products: Array<{
    code: string;
    product_name?: string;
    product_name_en?: string;
    brands?: string;
    image_url?: string;
    image_front_url?: string;
    nutriscore_grade?: string;
    [key: string]: any;
  }>;
  count: number;
  page: number;
  page_size: number;
  page_count: number;
}

/**
 * Get product by barcode
 */
export async function getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/v2/product/${barcode}.json`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }

    const data: OpenFoodFactsProduct = await response.json();
    
    if (data.status === 0) {
      return null; // Product not found
    }

    return data;
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    throw error;
  }
}

/**
 * Search for products
 * Note: Rate limit is 10 req/min for search queries
 */
export async function searchProducts(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResult> {
  try {
    const baseUrl = getApiBaseUrl();
    // URL encode the search query
    const encodedQuery = encodeURIComponent(query);
    const url = `${baseUrl}/cgi/search.pl?action=process&search_terms=${encodedQuery}&page_size=${pageSize}&page=${page}&json=true`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to search products: ${response.statusText}`);
    }

    const data: SearchResult = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
}


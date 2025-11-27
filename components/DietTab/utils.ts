/**
 * Utility functions for food/nutrition calculations
 */

export interface UnitOption {
  value: string;
  label: string;
  multiplier: number; // Multiplier to convert to grams for nutrition calculation
}

/**
 * Get available unit options for a product
 */
export function getAvailableUnits(product: any): UnitOption[] {
  const units: UnitOption[] = [];
  
  // Handle nested product structure (product.product vs direct product)
  const actualProduct = product?.product || product;
  
  // Get serving size info - OpenFoodFacts format: "1 fillet (168 g)"
  const servingSize = actualProduct?.serving_size;
  // serving_quantity can be a string or number - parse it
  const servingQuantityRaw = actualProduct?.serving_quantity;
  const servingQuantity = servingQuantityRaw ? parseFloat(String(servingQuantityRaw)) : null;
  const servingQuantityUnit = actualProduct?.serving_quantity_unit; // e.g., "g"
  
  // Parse serving_size format: "1 fillet (168 g)" or "1 potato (150 g)"
  if (servingSize && typeof servingSize === 'string') {
    // Match format: "1 fillet (168 g)" -> extract "fillet" and use serving_quantity for multiplier
    // Pattern: number + unit name + (weight + unit)
    // More flexible regex to handle variations
    const servingSizeMatch = servingSize.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s+([^(]+?)(?:\s*\([^)]+\))?\s*$/i);
    if (servingSizeMatch) {
      const [, quantityStr, unitName] = servingSizeMatch;
      // Calculate multiplier using serving_quantity (in grams)
      // serving_quantity is the weight in grams for 1 serving unit
      // e.g., serving_quantity = 168 means 1 fillet = 168g
      // Since nutriments are per 100g, multiplier = serving_quantity / 100
      let multiplier = 1;
      if (servingQuantity) {
        // serving_quantity is in grams (e.g., 168g), so divide by 100 to get multiplier
        // This gives us: 168g / 100g = 1.68x the per-100g values
        multiplier = servingQuantity / 100;
      }
      const cleanUnit = unitName.trim().toLowerCase();
      // Only add if it's not already in grams
      if (cleanUnit && !cleanUnit.match(/^\d+\s*g(?:ram)?s?$/i)) {
        // Add the serving unit (e.g., "fillet", "potato") - this should be the DEFAULT
        units.push({
          value: cleanUnit,
          label: `1 ${cleanUnit}${servingQuantity && servingQuantityUnit ? ` (${servingQuantity}${servingQuantityUnit})` : ''}`,
          multiplier,
        });
      }
    }
  }
  
  // If we have serving_quantity_unit but no serving_size, add it
  // But only if it's not "g" (we'll add gram options separately)
  if (servingQuantityUnit && servingQuantityUnit.toLowerCase() !== 'g' && !units.some(u => u.value === servingQuantityUnit.toLowerCase())) {
    let multiplier = 1;
    if (servingQuantity) {
      // serving_quantity is in grams, so divide by 100 to get multiplier
      multiplier = servingQuantity / 100;
    }
    const cleanUnit = servingQuantityUnit.toLowerCase();
    units.push({
      value: cleanUnit,
      label: `1 ${cleanUnit}${servingQuantity ? ` (${servingQuantity}${servingQuantityUnit})` : ''}`,
      multiplier,
    });
  }
  
  // Always add gram options at the end
  units.push(
    {
      value: '100g',
      label: '100g',
      multiplier: 1, // Already per 100g
    },
    {
      value: '1g',
      label: '1g',
      multiplier: 0.01, // 1g = 0.01 * 100g
    }
  );
  
  return units;
}

/**
 * Calculate nutrition values based on quantity and unit
 */
export function calculateNutritionForQuantity(
  nutriments: any,
  quantity: number,
  unit: string,
  availableUnits: UnitOption[]
): {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
} {
  // OpenFoodFacts uses "energy-kcal_100g" (with hyphen) not "energy_kcal_100g" (with underscore)
  const energyKcal = nutriments['energy-kcal_100g'] || nutriments.energy_kcal_100g;
  const proteins = nutriments.proteins_100g;
  const carbohydrates = nutriments.carbohydrates_100g;
  const fat = nutriments.fat_100g;
  
  if (!energyKcal) {
    return { calories: null, protein: null, carbs: null, fat: null };
  }
  
  // Find the unit option
  const unitOption = availableUnits.find(u => u.value === unit);
  
  // Calculate multiplier:
  // - If we have a unit option (e.g., "fillet" with multiplier 1.68), use: multiplier * quantity
  //   Example: 1 fillet = 1.68x per-100g values, so 1 fillet = 1.68 * 1 = 1.68x
  // - If no unit option (e.g., "100g"), assume quantity is in grams: quantity / 100
  //   Example: 100g = 100/100 = 1x per-100g values
  const multiplier = unitOption ? unitOption.multiplier * quantity : (quantity / 100);
  
  return {
    calories: Math.round(energyKcal * multiplier),
    protein: proteins ? parseFloat((proteins * multiplier).toFixed(1)) : null,
    carbs: carbohydrates ? parseFloat((carbohydrates * multiplier).toFixed(1)) : null,
    fat: fat ? parseFloat((fat * multiplier).toFixed(1)) : null,
  };
}


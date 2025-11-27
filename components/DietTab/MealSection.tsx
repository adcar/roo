'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { FoodLogItem } from './types';
import { ServingEditDialog } from './ServingEditDialog';
import { getAvailableUnits, calculateNutritionForQuantity } from './utils';

interface MealSectionProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodLogItem[];
  onAdd: () => void;
  onUpdateItem: (itemId: string, updates: { quantity?: string; mealType?: string }) => void;
  onDeleteItem: (itemId: string) => void;
}

const mealLabels = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

function parseQuantity(quantityStr: string): { quantity: number; unit: string } {
  // Format: "1.5|filet" or "100g" (legacy)
  if (quantityStr.includes('|')) {
    const [qty, unit] = quantityStr.split('|');
    return { quantity: parseFloat(qty) || 1, unit: unit || '100g' };
  }
  // Legacy format: just a number (assume 100g)
  return { quantity: parseFloat(quantityStr) || 1, unit: '100g' };
}

function calculateNutrition(item: FoodLogItem) {
  // Handle nested product structure: item.product could be:
  // 1. Full OpenFoodFacts response: {code, status, product: {...}}
  // 2. Just the product object: {nutriments: {...}}
  // 3. Already parsed nested: {product: {nutriments: {...}}}
  let product = item.product;
  if (product?.product) {
    product = product.product; // Extract nested product
  }
  
  const nutriments = product?.nutriments || {};
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('calculateNutrition - item:', {
      productId: item.productId,
      quantity: item.quantity,
      hasProduct: !!item.product,
      hasNestedProduct: !!item.product?.product,
      nutrimentsKeys: Object.keys(nutriments).slice(0, 10),
      energy_kcal_100g: nutriments['energy-kcal_100g'] || nutriments.energy_kcal_100g,
      proteins_100g: nutriments.proteins_100g,
    });
  }
  
  const { quantity, unit } = parseQuantity(item.quantity);
  const availableUnits = getAvailableUnits(product);
  
  const nutrition = calculateNutritionForQuantity(nutriments, quantity, unit, availableUnits);
  
  // Get display unit
  const unitOption = availableUnits.find(u => u.value === unit);
  const servingUnit = unitOption?.label || unit;

  return { 
    calories: nutrition.calories, 
    protein: nutrition.protein?.toFixed(1) || null, 
    carbs: nutrition.carbs?.toFixed(1) || null, 
    fat: nutrition.fat?.toFixed(1) || null,
    servingUnit 
  };
}

export function MealSection({ mealType, items, onAdd, onUpdateItem, onDeleteItem }: MealSectionProps) {
  const mealItems = items.filter(item => item.mealType === mealType);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const editingItem = editingItemId ? mealItems.find(item => item.id === editingItemId) : null;
  
  // Calculate totals
  const totals = mealItems.reduce((acc, item) => {
    const nutrition = calculateNutrition(item);
    return {
      calories: acc.calories + (nutrition.calories || 0),
      protein: acc.protein + parseFloat(nutrition.protein || '0'),
      carbs: acc.carbs + parseFloat(nutrition.carbs || '0'),
      fat: acc.fat + parseFloat(nutrition.fat || '0'),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{mealLabels[mealType]}</h3>
        <Button onClick={onAdd} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Food
        </Button>
      </div>
      
      {mealItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No items yet. Click "Add Food" to get started.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Food</th>
                <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Calories</th>
                <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Carbs</th>
                <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Fat</th>
                <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Protein</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {mealItems.map((item) => {
                // Handle nested product structure
                let product = item.product;
                if (product?.product) {
                  product = product.product;
                }
                const productName = product?.product_name || product?.product_name_en || 'Unknown Product';
                const { quantity, unit } = parseQuantity(item.quantity);
                const nutrition = calculateNutrition(item);
                const availableUnits = getAvailableUnits(product || item.product);
                const unitOption = availableUnits.find(u => u.value === unit);
                const displayUnit = unitOption?.label || unit;
                
                return (
                  <tr key={item.id} className="border-b hover:bg-accent/50">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{productName}</span>
                        <span className="text-xs text-muted-foreground">
                          {quantity} × {displayUnit}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => setEditingItemId(item.id)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="text-right py-2 px-2 text-sm">{nutrition.calories || '-'}</td>
                    <td className="text-right py-2 px-2 text-sm">{nutrition.carbs ? `${nutrition.carbs}g` : '-'}</td>
                    <td className="text-right py-2 px-2 text-sm">{nutrition.fat ? `${nutrition.fat}g` : '-'}</td>
                    <td className="text-right py-2 px-2 text-sm">{nutrition.protein ? `${nutrition.protein}g` : '-'}</td>
                    <td className="py-2 px-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteItem(item.id)}
                        className="h-6 w-6"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {mealItems.length > 0 && (
                <tr className="border-t-2 font-semibold">
                  <td className="py-2 px-2 text-sm">Totals</td>
                  <td className="text-right py-2 px-2 text-sm">{Math.round(totals.calories)}</td>
                  <td className="text-right py-2 px-2 text-sm">{totals.carbs.toFixed(1)}g</td>
                  <td className="text-right py-2 px-2 text-sm">{totals.fat.toFixed(1)}g</td>
                  <td className="text-right py-2 px-2 text-sm">{totals.protein.toFixed(1)}g</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {editingItem && (
        <ServingEditDialog
          open={!!editingItem}
          onClose={() => setEditingItemId(null)}
          onSave={(quantity, unit) => {
            onUpdateItem(editingItem.id, { quantity: `${quantity}|${unit}` });
            setEditingItemId(null);
          }}
          currentQuantity={editingItem.quantity}
          currentUnit={parseQuantity(editingItem.quantity).unit}
          productName={(() => {
            const product = editingItem.product?.product || editingItem.product;
            return product?.product_name || product?.product_name_en || 'Unknown Product';
          })()}
          product={editingItem.product?.product || editingItem.product}
        />
      )}
    </Card>
  );
}


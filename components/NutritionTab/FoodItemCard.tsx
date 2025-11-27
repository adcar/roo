'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { FoodLogItem } from './types';

interface FoodItemCardProps {
  item: FoodLogItem;
  onUpdate?: (updates: { quantity?: string; mealType?: string }) => void;
  onDelete?: () => void;
}

export function FoodItemCard({ item, onUpdate, onDelete }: FoodItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [servings, setServings] = useState(item.quantity);
  
  // Handle different product data structures (from API or cached)
  const product = item.product?.product || item.product;
  const productName = product?.product_name || product?.product_name_en || 'Unknown Product';
  const nutriments = product?.nutriments || {};
  
  // Get serving size info
  const servingQuantity = product?.serving_quantity;
  const servingUnit = product?.serving_quantity_unit || product?.serving_size || 'serving';
  const servingText = servingUnit && servingUnit !== 'g' ? servingUnit : null;

  const handleSave = () => {
    const numServings = parseFloat(servings);
    if (onUpdate && !isNaN(numServings) && numServings > 0) {
      onUpdate({ quantity: numServings.toString() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setServings(item.quantity);
    setIsEditing(false);
  };

  // Calculate nutrition values based on servings
  const numServings = parseFloat(servings) || 1;
  let multiplier = numServings;
  
  // If we have serving_quantity (e.g., 100g per serving), use that
  if (servingQuantity && nutriments.energy_kcal_100g) {
    // Values are per 100g, so: (servingQuantity / 100) * servings
    multiplier = (servingQuantity / 100) * numServings;
  } else if (nutriments.energy_kcal_100g) {
    // Fallback: assume quantity is in grams if no serving info
    multiplier = numServings / 100;
  }

  const calories = nutriments.energy_kcal_100g ? Math.round(nutriments.energy_kcal_100g * multiplier) : null;
  const protein = nutriments.proteins_100g ? (nutriments.proteins_100g * multiplier).toFixed(1) : null;
  const carbs = nutriments.carbohydrates_100g ? (nutriments.carbohydrates_100g * multiplier).toFixed(1) : null;
  const fat = nutriments.fat_100g ? (nutriments.fat_100g * multiplier).toFixed(1) : null;

  return (
    <div className="flex items-center gap-3 text-sm py-1">
      {isEditing ? (
        <>
          <div className="flex-1 min-w-0 font-medium truncate">{productName}</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="h-7 w-20 text-xs"
              placeholder="1.0"
              autoFocus
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {servingText || 'serving'}
              {parseFloat(servings) !== 1 ? 's' : ''}
            </span>
            <Button size="icon" variant="ghost" onClick={handleSave} className="h-7 w-7">
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} className="h-7 w-7">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0 font-medium truncate">{productName}</div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-muted-foreground whitespace-nowrap">
              {numServings} {servingText || 'serving'}{numServings !== 1 ? 's' : ''}
            </span>
            {onUpdate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          {calories !== null && (
            <div className="text-right min-w-[50px] text-xs">
              <div className="text-muted-foreground">Cal</div>
              <div className="font-medium">{calories}</div>
            </div>
          )}
          {protein !== null && (
            <div className="text-right min-w-[45px] text-xs">
              <div className="text-muted-foreground">P</div>
              <div className="font-medium">{protein}g</div>
            </div>
          )}
          {carbs !== null && (
            <div className="text-right min-w-[45px] text-xs">
              <div className="text-muted-foreground">C</div>
              <div className="font-medium">{carbs}g</div>
            </div>
          )}
          {fat !== null && (
            <div className="text-right min-w-[45px] text-xs">
              <div className="text-muted-foreground">F</div>
              <div className="font-medium">{fat}g</div>
            </div>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-7 w-7 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

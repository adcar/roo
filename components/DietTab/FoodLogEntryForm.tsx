'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import { FoodLogItem, FoodTemplateItem } from './types';
import { ProductSearch } from './ProductSearch';
import { ProductScan } from './ProductScan';
import { QuantityInput } from './QuantityInput';
import { getAvailableUnits } from './utils';

interface FoodLogEntryFormProps {
  items: FoodLogItem[];
  onSave: (items: Omit<FoodLogItem, 'id' | 'logEntryId' | 'createdAt' | 'product'>[]) => void;
  onCancel?: () => void;
  loading?: boolean;
}

function parseQuantity(quantityStr: string): { quantity: string; unit: string } {
  if (quantityStr.includes('|')) {
    const [qty, unit] = quantityStr.split('|');
    return { quantity: qty || '1', unit: unit || '100g' };
  }
  // Legacy format: try to parse "100g" or "1 piece" etc.
  // If it's just a number, assume grams
  const numMatch = quantityStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (numMatch) {
    const [, qty, unit] = numMatch;
    return { quantity: qty, unit: unit.trim() || '100g' };
  }
  return { quantity: quantityStr || '1', unit: '100g' };
}

export function FoodLogEntryForm({ items: initialItems, onSave, onCancel, loading }: FoodLogEntryFormProps) {
  const [items, setItems] = useState<Array<{
    productId: string;
    quantity: string;
    unit: string;
    mealType?: string;
    product?: any;
  }>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  useEffect(() => {
    // Initialize items from initialItems, parsing quantity format
    const mappedItems = initialItems.map(item => {
      const parsed = parseQuantity(item.quantity);
      return {
        productId: item.productId,
        quantity: parsed.quantity,
        unit: parsed.unit,
        mealType: item.mealType,
        product: item.product,
      };
    });
    setItems(mappedItems);
  }, [initialItems]);

  const handleProductSelect = async (productId: string) => {
    setLoadingProduct(productId);
    try {
      const response = await fetch(`/api/products?barcode=${encodeURIComponent(productId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }
      const productData = await response.json();
      
      // Get default unit - prefer serving_size unit (e.g., "fillet", "potato"), fallback to 100g
      const availableUnits = getAvailableUnits(productData);
      const defaultUnit = availableUnits.length > 0 && availableUnits[0].value !== '100g' && availableUnits[0].value !== '1g' 
        ? availableUnits[0].value 
        : '100g';
      
      setItems([...items, {
        productId,
        quantity: '1',
        unit: defaultUnit,
        mealType: undefined,
        product: productData, // Store the full API response
      }]);
    } catch (error) {
      console.error('Error loading product:', error);
      // Still add the item even if product fetch fails, so user can manually enter info
      setItems([...items, {
        productId,
        quantity: '1',
        unit: '100g',
        mealType: undefined,
        product: null,
      }]);
    } finally {
      setLoadingProduct(null);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, updates: Partial<typeof items[0]>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const handleSave = () => {
    onSave(items.map(item => ({
      productId: item.productId,
      quantity: `${item.quantity}|${item.unit}`, // Format as quantity|unit
      mealType: item.mealType,
    })));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => setSearchOpen(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Search Product
        </Button>
        <Button onClick={() => setScanOpen(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Scan Barcode
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          // Handle different product data structures
          const productData = item.product?.product || item.product;
          const productName = productData?.product_name || 
                             productData?.product_name_en || 
                             (loadingProduct === item.productId ? 'Loading...' : 'Unknown Product');
          
          // Get available units for this product
          const availableUnits = getAvailableUnits(item.product);
          
          return (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">
                  {productName}
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <QuantityInput
                    quantity={item.quantity}
                    unit={item.unit}
                    onQuantityChange={(qty) => handleUpdateItem(index, { quantity: qty })}
                    onUnitChange={(unit) => handleUpdateItem(index, { unit })}
                    availableUnits={availableUnits}
                    productName={productName}
                  />
                </div>
                <div>
                  <Label htmlFor={`mealType-${index}`}>Meal Type</Label>
                  <Select
                    value={item.mealType || 'none'}
                    onValueChange={(value) => handleUpdateItem(index, { mealType: value === 'none' ? undefined : value })}>
                    <SelectTrigger id={`mealType-${index}`}>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveItem(index)}
                className="w-full"
              >
                Remove
              </Button>
            </div>
          </Card>
          );
        })}
      </div>

      {items.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No food items added yet. Search or scan to add products.
        </p>
      )}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={loading || items.length === 0}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>

      <ProductSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleProductSelect}
      />
      <ProductScan
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onSelect={handleProductSelect}
      />
    </div>
  );
}


'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductSearchInline } from './ProductSearchInline';
import { ProductScanInline } from './ProductScanInline';
import { MyFoodBrowser } from './MyFoodBrowser';
import { QuantityInput } from './QuantityInput';
import { getAvailableUnits } from './utils';

interface AddFoodDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (items: Array<{ productId: string; quantity: string; mealType?: string }>) => void;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  loading?: boolean;
}

interface SelectedProduct {
  productId: string;
  quantity: string;
  unit: string;
  productName?: string;
  productData?: any;
}

export function AddFoodDialog({ open, onClose, onAdd, mealType, loading }: AddFoodDialogProps) {
  const [activeTab, setActiveTab] = useState<'myfood' | 'search' | 'scan'>('myfood');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(new Set());

  const handleProductSelect = async (productId: string) => {
    // Check if already selected
    if (selectedProducts.some(p => p.productId === productId)) {
      return;
    }
    
    setLoadingProducts(new Set([...loadingProducts, productId]));
    
    // Load product data to get name
    try {
      const response = await fetch(`/api/products?barcode=${encodeURIComponent(productId)}`);
      const productData = await response.json();
      // Handle nested structure: productData.product or direct productData
      const product = productData.product || productData;
      const productName = product?.product_name || product?.product_name_en || 'Unknown Product';
      
      // Get default unit - prefer serving_size unit (e.g., "fillet", "potato"), fallback to 100g
      const availableUnits = getAvailableUnits(productData); // Pass full response to handle nested structure
      // The first unit is usually the serving_size unit, which should be the default
      const defaultUnit = availableUnits.length > 0 && availableUnits[0].value !== '100g' && availableUnits[0].value !== '1g' 
        ? availableUnits[0].value 
        : '100g';
      
      setSelectedProducts([...selectedProducts, { 
        productId, 
        quantity: '1',
        unit: defaultUnit,
        productName,
        productData: productData, // Store the full response
      }]);
    } catch (error) {
      console.error('Error loading product:', error);
      setSelectedProducts([...selectedProducts, { 
        productId, 
        quantity: '1',
        unit: '100g',
        productName: 'Loading...'
      }]);
    } finally {
      const newLoading = new Set(loadingProducts);
      newLoading.delete(productId);
      setLoadingProducts(newLoading);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: string, unit?: string) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.productId === productId ? { ...p, quantity, unit: unit || p.unit } : p
    ));
  };

  const handleUpdateUnit = (productId: string, unit: string) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.productId === productId ? { ...p, unit } : p
    ));
  };

  const handleAdd = () => {
    if (selectedProducts.length === 0) return;
    // Format quantity as "quantity|unit" for storage
    onAdd(selectedProducts.map(p => ({
      productId: p.productId,
      quantity: `${p.quantity}|${p.unit}`,
      mealType,
    })));
    setSelectedProducts([]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Food - {mealType.charAt(0).toUpperCase() + mealType.slice(1)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="myfood">My Food</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="scan">Scan</TabsTrigger>
              </TabsList>
              
              <TabsContent value="myfood" className="mt-4">
                <MyFoodBrowser
                  onSelect={handleProductSelect}
                  selectedProducts={selectedProducts.map(p => ({
                    productId: p.productId,
                    quantity: `${p.quantity}|${p.unit}`,
                    unit: p.unit,
                    productName: p.productName,
                  }))}
                  onRemove={handleRemoveProduct}
                />
              </TabsContent>
              
              <TabsContent value="search" className="mt-4">
                <ProductSearchInline onSelect={handleProductSelect} />
              </TabsContent>
              
              <TabsContent value="scan" className="mt-4">
                <ProductScanInline onSelect={handleProductSelect} />
              </TabsContent>
            </Tabs>

            {selectedProducts.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Selected Items ({selectedProducts.length})</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedProducts.map((p) => {
                    // Handle both nested (productData.product) and direct (productData) structures
                    const product = p.productData?.product || p.productData;
                    const availableUnits = getAvailableUnits(product);
                    
                    return (
                      <div key={p.productId} className="flex flex-col gap-3 p-3 bg-accent rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-sm flex-1 min-w-0 break-words">{p.productName || `Product ${p.productId}`}</span>
                          <button
                            onClick={() => handleRemoveProduct(p.productId)}
                            className="text-destructive hover:underline text-xs shrink-0 whitespace-nowrap"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <QuantityInput
                            quantity={p.quantity}
                            unit={p.unit}
                            onQuantityChange={(qty) => handleUpdateQuantity(p.productId, qty, p.unit)}
                            onUnitChange={(unit) => handleUpdateUnit(p.productId, unit)}
                            availableUnits={availableUnits}
                            productName={p.productId}
                            className="flex-1 min-w-[280px]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-md hover:bg-accent w-full sm:w-auto"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={loading || selectedProducts.length === 0}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 w-full sm:w-auto"
              >
                {loading ? 'Adding...' : `Add ${selectedProducts.length} Item${selectedProducts.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}


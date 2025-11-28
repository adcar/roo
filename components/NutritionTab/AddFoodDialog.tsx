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
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  const handleProductSelect = async (productId: string) => {
    setLoadingProduct(true);
    
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
      
      setSelectedProduct({ 
        productId, 
        quantity: '1',
        unit: defaultUnit,
        productName,
        productData: productData, // Store the full response
      });
    } catch (error) {
      console.error('Error loading product:', error);
      setSelectedProduct({ 
        productId, 
        quantity: '1',
        unit: '100g',
        productName: 'Unknown Product'
      });
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleUpdateQuantity = (quantity: string) => {
    if (selectedProduct) {
      setSelectedProduct({ ...selectedProduct, quantity });
    }
  };

  const handleUpdateUnit = (unit: string) => {
    if (selectedProduct) {
      setSelectedProduct({ ...selectedProduct, unit });
    }
  };

  const handleAdd = () => {
    if (!selectedProduct) return;
    // Format quantity as "quantity|unit" for storage
    onAdd([{
      productId: selectedProduct.productId,
      quantity: `${selectedProduct.quantity}|${selectedProduct.unit}`,
      mealType,
    }]);
    setSelectedProduct(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedProduct(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Food - {mealType.charAt(0).toUpperCase() + mealType.slice(1)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="myfood">My Food</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="scan">Scan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="myfood" className="mt-4">
              <MyFoodBrowser
                onSelect={handleProductSelect}
                selectedProductId={selectedProduct?.productId}
              />
            </TabsContent>
            
            <TabsContent value="search" className="mt-4">
              <ProductSearchInline onSelect={handleProductSelect} />
            </TabsContent>
            
            <TabsContent value="scan" className="mt-4">
              <ProductScanInline onSelect={handleProductSelect} />
            </TabsContent>
          </Tabs>

          {selectedProduct && (
            <div className="border-t pt-4 space-y-3">
              <div className="font-medium text-sm">{selectedProduct.productName || `Product ${selectedProduct.productId}`}</div>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const product = selectedProduct.productData?.product || selectedProduct.productData;
                  const availableUnits = getAvailableUnits(product);
                  return (
                    <QuantityInput
                      quantity={selectedProduct.quantity}
                      unit={selectedProduct.unit}
                      onQuantityChange={handleUpdateQuantity}
                      onUnitChange={handleUpdateUnit}
                      availableUnits={availableUnits}
                      productName={selectedProduct.productId}
                      className="flex-1 min-w-[280px]"
                    />
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 border rounded-md hover:bg-accent"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={loading || !selectedProduct}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


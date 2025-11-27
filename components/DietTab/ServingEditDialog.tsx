'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { QuantityInput } from './QuantityInput';
import { getAvailableUnits } from './utils';

interface ServingEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (quantity: string, unit: string) => void;
  currentQuantity: string;
  currentUnit?: string;
  productName: string;
  product?: any;
}

function parseQuantity(quantityStr: string): { quantity: string; unit: string } {
  if (quantityStr.includes('|')) {
    const [qty, unit] = quantityStr.split('|');
    return { quantity: qty || '1', unit: unit || '100g' };
  }
  return { quantity: quantityStr || '1', unit: '100g' };
}

export function ServingEditDialog({ 
  open, 
  onClose, 
  onSave, 
  currentQuantity,
  currentUnit,
  productName,
  product,
}: ServingEditDialogProps) {
  const parsed = parseQuantity(currentQuantity);
  const [quantity, setQuantity] = useState(parsed.quantity);
  const [unit, setUnit] = useState(currentUnit || parsed.unit);
  const availableUnits = getAvailableUnits(product);

  useEffect(() => {
    if (open) {
      const parsed = parseQuantity(currentQuantity);
      setQuantity(parsed.quantity);
      setUnit(currentUnit || parsed.unit);
    }
  }, [open, currentQuantity, currentUnit]);

  const handleSave = () => {
    const numQuantity = parseFloat(quantity);
    if (!isNaN(numQuantity) && numQuantity > 0) {
      onSave(quantity, unit);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle>Edit Servings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">{productName}</Label>
          </div>
          <div>
            <QuantityInput
              quantity={quantity}
              unit={unit}
              onQuantityChange={setQuantity}
              onUnitChange={setUnit}
              availableUnits={availableUnits}
              productName={productName}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


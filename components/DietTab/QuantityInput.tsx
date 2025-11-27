'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface QuantityInputProps {
  quantity: string;
  unit: string;
  onQuantityChange: (quantity: string) => void;
  onUnitChange: (unit: string) => void;
  availableUnits: Array<{ value: string; label: string }>;
  productName?: string;
  className?: string;
}

export function QuantityInput({
  quantity,
  unit,
  onQuantityChange,
  onUnitChange,
  availableUnits,
  productName,
  className = '',
}: QuantityInputProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Label htmlFor={`qty-${productName}`} className="text-sm whitespace-nowrap shrink-0">Qty:</Label>
      <Input
        id={`qty-${productName}`}
        type="number"
        step="0.1"
        value={quantity}
        onChange={(e) => onQuantityChange(e.target.value)}
        className="w-20 h-8 text-sm shrink-0"
        placeholder="1"
      />
      <span className="text-sm whitespace-nowrap shrink-0">of</span>
      <Select value={unit} onValueChange={onUnitChange}>
        <SelectTrigger className="w-[140px] sm:w-[160px] md:w-48 h-8 text-sm shrink-0">
          <SelectValue placeholder="Select unit" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {availableUnits.map((u) => (
            <SelectItem key={u.value} value={u.value}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}


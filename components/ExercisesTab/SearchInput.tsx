'use client';

import { memo } from 'react';
import { Input } from '@/components/ui/input';

export const SearchInput = memo(function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      type="text"
      placeholder="Search exercises..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-[200px] flex-1"
    />
  );
});


'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Trash2, Loader2 } from 'lucide-react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface MyFoodItem {
  productId: string;
  productName: string;
  product?: any;
  lastUsed?: string;
}

interface MyFoodBrowserProps {
  onSelect: (productId: string) => void;
  selectedProducts: Array<{ productId: string; quantity: string; unit: string; productName?: string }>;
  onRemove: (productId: string) => void;
}

export function MyFoodBrowser({ onSelect, selectedProducts, onRemove }: MyFoodBrowserProps) {
  const [foods, setFoods] = useState<MyFoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadMyFoods();
  }, []);

  const loadMyFoods = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/my-foods');
      const data = await response.json();
      setFoods(data);
    } catch (error) {
      console.error('Error loading my foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (productId: string, productName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete({ id: productId, name: productName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    setDeletingId(itemToDelete.id);
    try {
      const response = await fetch(`/api/my-foods/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadMyFoods();
      }
    } catch (error) {
      console.error('Error deleting food:', error);
    } finally {
      setDeletingId(null);
      setItemToDelete(null);
    }
  };

  const filteredFoods = foods.filter(food =>
    food.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    food.productId.includes(searchQuery)
  );

  const isSelected = (productId: string) => selectedProducts.some(p => p.productId === productId);

  if (loading) {
    return <div className="text-center py-8">Loading your foods...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your foods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredFoods.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? 'No foods found matching your search.' : 'No foods added yet. Add foods by searching or scanning to build your list.'}
        </div>
      ) : (
        <div className="grid gap-2 max-h-96 overflow-y-auto">
          {filteredFoods.map((food) => {
            const selected = isSelected(food.productId);
            
            return (
              <Card
                key={food.productId}
                className={`p-3 cursor-pointer transition-colors focus:outline-none focus-visible:outline-none ${
                  selected ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-border'
                }`}
                onClick={() => {
                  if (selected) {
                    onRemove(food.productId);
                  } else {
                    onSelect(food.productId);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{food.productName}</h4>
                    {food.lastUsed && (
                      <p className="text-xs text-muted-foreground">Last used: {food.lastUsed}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {selected && (
                      <span className="text-xs text-primary font-medium">Selected</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(food.productId, food.productName, e)}
                      disabled={deletingId === food.productId}
                      className="h-8 w-8"
                    >
                      {deletingId === food.productId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Remove food from your list?"
        description={`Are you sure you want to remove "${itemToDelete?.name}" from your list? This action cannot be undone.`}
        itemName={itemToDelete?.name}
      />
    </div>
  );
}


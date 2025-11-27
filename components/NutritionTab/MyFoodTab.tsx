'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Search, Trash2, Loader2 } from 'lucide-react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface MyFoodItem {
  productId: string;
  productName: string;
  product?: any;
  lastUsed?: string;
}

export function MyFoodTab() {
  const [foods, setFoods] = useState<MyFoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [expandedImage, setExpandedImage] = useState<{ url: string; alt: string } | null>(null);

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

  const handleDeleteClick = (productId: string, productName: string) => {
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

  if (loading) {
    return <div className="text-center py-8">Loading your foods...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">My Food</h3>
          <p className="text-sm text-muted-foreground">
            {foods.length} food{foods.length !== 1 ? 's' : ''} you've added
          </p>
        </div>
      </div>

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
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No foods found matching your search.' : 'No foods added yet. Add foods by searching or scanning to build your list.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredFoods.map((food) => {
            const product = food.product?.product || food.product;
            const nutriments = product?.nutriments || {};
            const servingSize = product?.serving_size || product?.serving_quantity;
            const servingUnit = product?.serving_quantity_unit || 'g';
            const servingText = servingSize ? `${servingSize}${servingUnit !== 'g' ? ' ' + servingUnit : ''}` : null;

            const imageUrl = product?.image_url || product?.image_front_url || product?.image_front_small_url;

            return (
              <Card key={food.productId} className="p-4">
                <div className="flex items-stretch justify-between gap-4">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={food.productName}
                      className="w-20 self-stretch object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setExpandedImage({ url: imageUrl, alt: food.productName })}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1">{food.productName}</h4>
                    {food.lastUsed && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Last used: {food.lastUsed}
                      </p>
                    )}
                    {servingText && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Serving size: {servingText}
                      </p>
                    )}
                    {(nutriments.energy_kcal_100g !== undefined || nutriments.proteins_100g !== undefined) && (
                      <div className="text-xs space-y-0.5 mt-2">
                        {nutriments.energy_kcal_100g !== undefined && (
                          <div>
                            <span className="font-medium">Calories:</span> {nutriments.energy_kcal_100g} kcal per 100g
                          </div>
                        )}
                        <div className="flex gap-4">
                          {nutriments.proteins_100g !== undefined && (
                            <div>
                              <span className="font-medium">Protein:</span> {nutriments.proteins_100g}g/100g
                            </div>
                          )}
                          {nutriments.carbohydrates_100g !== undefined && (
                            <div>
                              <span className="font-medium">Carbs:</span> {nutriments.carbohydrates_100g}g/100g
                            </div>
                          )}
                          {nutriments.fat_100g !== undefined && (
                            <div>
                              <span className="font-medium">Fat:</span> {nutriments.fat_100g}g/100g
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(food.productId, food.productName)}
                    disabled={deletingId === food.productId}
                  >
                    {deletingId === food.productId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
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

      {/* Expanded Image Dialog */}
      <Dialog open={!!expandedImage} onOpenChange={(open) => !open && setExpandedImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          {expandedImage && (
            <>
              <DialogTitle className="sr-only">
                {expandedImage.alt} - Expanded view
              </DialogTitle>
              <div className="relative w-full max-h-[80vh] bg-muted flex items-center justify-center">
                <img
                  src={expandedImage.url}
                  alt={expandedImage.alt}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


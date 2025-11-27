'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Product {
  code: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  nutriscore_grade?: string;
}

interface ProductSearchProps {
  open: boolean;
  onClose: () => void;
  onSelect: (productId: string) => void;
}

export function ProductSearch({ open, onClose, onSelect }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `/api/products?search=${encodeURIComponent(searchQuery)}&page=${page}`
      );
      const data = await response.json();
      
      if (data.products) {
        setProducts(data.products);
        setHasMore(data.page < data.page_count);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelect = (productId: string) => {
    onSelect(productId);
    setSearchQuery('');
    setProducts([]);
    setPage(1);
    setHasSearched(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Products</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {products.length > 0 && (
            <div className="space-y-2">
              {products.map((product) => (
                <Card
                  key={product.code}
                  className="p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSelect(product.code)}
                >
                  <div className="flex gap-4">
                    {(product.image_url || product.image_front_url) && (
                      <img
                        src={product.image_url || product.image_front_url}
                        alt={product.product_name || product.product_name_en}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {product.product_name || product.product_name_en || 'Unknown Product'}
                      </h3>
                      {product.brands && (
                        <p className="text-sm text-muted-foreground">{product.brands}</p>
                      )}
                      {product.nutriscore_grade && (
                        <span className="text-xs text-muted-foreground">
                          Nutri-Score: {product.nutriscore_grade.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setPage(page + 1);
                    handleSearch();
                  }}
                >
                  Load More
                </Button>
              )}
            </div>
          )}

          {hasSearched && products.length === 0 && !loading && (
            <p className="text-center text-muted-foreground">
              No products found. Try a different search term.
            </p>
          )}
          
          {!hasSearched && !loading && (
            <p className="text-center text-muted-foreground">
              Enter a search term and click Search to find products.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


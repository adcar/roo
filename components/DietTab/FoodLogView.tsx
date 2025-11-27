'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FoodLogData, FoodLogItem } from './types';
import { MealSection } from './MealSection';
import { AddFoodDialog } from './AddFoodDialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { getAvailableUnits, calculateNutritionForQuantity } from './utils';

interface FoodLogViewProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

function MacroPieChart({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat;
  
  const chartConfig = {
    protein: {
      label: 'Protein',
      theme: {
        light: 'oklch(0.4341 0.0392 41.9938)', // primary color in light mode
        dark: 'oklch(0.9247 0.0524 66.1732)', // primary color in dark mode
      },
    },
    carbs: {
      label: 'Carbs',
      theme: {
        light: 'oklch(0.9200 0.0651 74.3695)', // secondary color in light mode
        dark: 'oklch(0.3163 0.0190 63.6992)', // secondary color in dark mode
      },
    },
    fat: {
      label: 'Fat',
      theme: {
        light: 'oklch(0.55 0.12 200)', // trinary color in light mode
        dark: 'oklch(0.65 0.12 200)', // trinary color in dark mode
      },
    },
  };

  const data = [
    { name: 'protein', value: protein },
    { name: 'carbs', value: carbs },
    { name: 'fat', value: fat },
  ].filter(item => item.value > 0);

  return (
    <ChartContainer config={chartConfig} className="h-[200px]">
      <PieChart>
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload || !payload[0]) return null;
            const value = payload[0].value as number;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            const name = payload[0].name as string;
            const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
            return (
              <ChartTooltipContent>
                <div className="flex flex-col gap-1">
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-muted-foreground">
                    {value.toFixed(1)}g ({percentage}%)
                  </div>
                </div>
              </ChartTooltipContent>
            );
          }}
        />
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={70}
          innerRadius={30}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={`var(--color-${entry.name})`}
            />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          className="-translate-y-2"
        />
      </PieChart>
    </ChartContainer>
  );
}

export function FoodLogView({ date, onDateChange }: FoodLogViewProps) {
  const [logData, setLogData] = useState<FoodLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [addFoodMealType, setAddFoodMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Store the last saved state for rollback on error
  const lastSavedDataRef = useRef<FoodLogData | null>(null);
  // Debounce timer for save operations
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if there's a pending save
  const pendingSaveRef = useRef<Array<{
    productId: string;
    quantity: string;
    mealType?: string;
  }> | null>(null);

  const dateString = format(date, 'yyyy-MM-dd');

  const loadLogData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const response = await fetch(`/api/food-logs?date=${dateString}`);
      const data = await response.json();
      setLogData(data);
      lastSavedDataRef.current = data;
    } catch (error) {
      console.error('Error loading food log:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [dateString]);

  useEffect(() => {
    loadLogData();
  }, [loadLogData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Debounced save function - saves in background without showing loading
  const debouncedSave = useCallback((items: Array<{
    productId: string;
    quantity: string;
    mealType?: string;
  }>) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Store pending save
    pendingSaveRef.current = items;

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      const itemsToSave = pendingSaveRef.current;
      if (!itemsToSave) return;

      try {
        const response = await fetch('/api/food-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateString,
            items: itemsToSave,
          }),
        });

        if (response.ok) {
          // Silently refresh data in background without showing loading
          await loadLogData(false);
          pendingSaveRef.current = null;
        } else {
          // On error, reload to sync back with server
          console.error('Error saving food log:', response.statusText);
          await loadLogData(false);
        }
      } catch (error) {
        console.error('Error saving food log:', error);
        // On error, reload to sync back with server
        await loadLogData(false);
      }
    }, 500); // 500ms debounce
  }, [dateString, loadLogData]);

  // Immediate save (for add food dialog)
  const handleSave = async (items: Array<{
    productId: string;
    quantity: string;
    mealType?: string;
  }>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/food-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateString,
          items,
        }),
      });

      if (response.ok) {
        await loadLogData(false); // Silent refresh
        setAddFoodOpen(false);
      }
    } catch (error) {
      console.error('Error saving food log:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFood = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setAddFoodMealType(mealType);
    setAddFoodOpen(true);
  };

  const handleAddFoodItems = async (items: Array<{
    productId: string;
    quantity: string;
    mealType?: string;
  }>) => {
    // Merge with existing items
    const existingItems = logData?.items || [];
    const allItems = [
      ...existingItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        mealType: item.mealType,
      })),
      ...items.map(item => ({
        ...item,
        mealType: item.mealType || addFoodMealType,
      })),
    ];
    
    // Optimistically update UI
    const newItems: FoodLogItem[] = [
      ...existingItems,
      ...items.map((item, idx) => ({
        id: `temp_${Date.now()}_${idx}`,
        productId: item.productId,
        quantity: item.quantity,
        mealType: item.mealType || addFoodMealType,
        product: null, // Will be populated on reload
        createdAt: new Date().toISOString(),
      })),
    ];
    setLogData(prev => prev ? { ...prev, items: newItems } : null);
    
    await handleSave(allItems);
  };

  const handleUpdateItem = (itemId: string, updates: { quantity?: string; mealType?: string }) => {
    if (!logData?.items) return;

    // Optimistically update local state immediately
    const updatedItems = logData.items.map(item => 
      item.id === itemId 
        ? { ...item, ...updates }
        : item
    );
    
    setLogData(prev => prev ? { ...prev, items: updatedItems } : null);

    // Debounced save in background
    debouncedSave(updatedItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      mealType: item.mealType,
    })));
  };

  const handleDeleteItem = (itemId: string) => {
    if (!logData?.items) return;

    // Optimistically update local state immediately
    const updatedItems = logData.items.filter(item => item.id !== itemId);
    
    setLogData(prev => prev ? { ...prev, items: updatedItems } : null);

    // Debounced save in background
    debouncedSave(updatedItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      mealType: item.mealType,
    })));
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !logData?.items || logData.items.length === 0) return;

    setSavingTemplate(true);
    try {
      const response = await fetch('/api/food-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          items: logData.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            mealType: item.mealType,
          })),
        }),
      });

      if (response.ok) {
        setSaveTemplateOpen(false);
        setTemplateName('');
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSavingTemplate(false);
    }
  };

  const calculateTotals = useMemo(() => {
    if (!logData?.items || logData.items.length === 0) return null;

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    logData.items.forEach(item => {
      // Handle nested product structure
      let product = item.product;
      if (product?.product) {
        product = product.product;
      }
      
      const nutriments = product?.nutriments || {};
      
      // Parse quantity: "1.5|fillet" or "100g" (legacy)
      let quantity = 100;
      let unit = '100g';
      if (item.quantity.includes('|')) {
        const [qty, unitStr] = item.quantity.split('|');
        quantity = parseFloat(qty) || 1;
        unit = unitStr || '100g';
      } else {
        const quantityMatch = item.quantity.match(/(\d+\.?\d*)/);
        quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 100;
        unit = '100g';
      }
      
      const availableUnits = getAvailableUnits(product);
      const nutrition = calculateNutritionForQuantity(nutriments, quantity, unit, availableUnits);
      
      if (nutrition.calories !== null) {
        totalCalories += nutrition.calories;
      }
      if (nutrition.protein !== null) {
        totalProtein += nutrition.protein;
      }
      if (nutrition.carbs !== null) {
        totalCarbs += nutrition.carbs;
      }
      if (nutrition.fat !== null) {
        totalFat += nutrition.fat;
      }
    });

    return { totalCalories, totalProtein, totalCarbs, totalFat };
  }, [logData?.items]);

  const totals = calculateTotals;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Food Log</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal mt-2",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && onDateChange(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {logData?.items && logData.items.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setSaveTemplateOpen(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Day as Template
          </Button>
        )}
      </div>

      {totals && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Daily Totals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Calories</div>
                <div className="text-lg font-semibold">{Math.round(totals.totalCalories)} kcal</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Protein</div>
                <div className="text-lg font-semibold">{totals.totalProtein.toFixed(1)}g</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Carbs</div>
                <div className="text-lg font-semibold">{totals.totalCarbs.toFixed(1)}g</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fat</div>
                <div className="text-lg font-semibold">{totals.totalFat.toFixed(1)}g</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Macro Distribution</h3>
            {totals.totalProtein + totals.totalCarbs + totals.totalFat > 0 ? (
              <MacroPieChart 
                protein={totals.totalProtein}
                carbs={totals.totalCarbs}
                fat={totals.totalFat}
              />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data to display
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <MealSection
          mealType="breakfast"
          items={logData?.items || []}
          onAdd={() => handleAddFood('breakfast')}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
        />
        <MealSection
          mealType="lunch"
          items={logData?.items || []}
          onAdd={() => handleAddFood('lunch')}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
        />
        <MealSection
          mealType="dinner"
          items={logData?.items || []}
          onAdd={() => handleAddFood('dinner')}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
        />
        <MealSection
          mealType="snack"
          items={logData?.items || []}
          onAdd={() => handleAddFood('snack')}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
        />
      </div>

      <AddFoodDialog
        open={addFoodOpen}
        onClose={() => setAddFoodOpen(false)}
        onAdd={handleAddFoodItems}
        mealType={addFoodMealType}
        loading={saving}
      />

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Day as Template</DialogTitle>
            <DialogDescription>
              Save all food items from this day as a template for quick reuse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., My Typical Day, Workout Day"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && templateName.trim()) {
                    handleSaveAsTemplate();
                  }
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {logData?.items.length || 0} item{(logData?.items.length || 0) !== 1 ? 's' : ''} will be saved
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSaveTemplateOpen(false);
              setTemplateName('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={savingTemplate || !templateName.trim() || !logData?.items || logData.items.length === 0}
            >
              {savingTemplate ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

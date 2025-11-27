'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FoodLogView } from './FoodLogView';
import { FoodTemplateManager } from './FoodTemplateManager';
import { MyFoodTab } from './MyFoodTab';
import { format } from 'date-fns';

export default function NutritionTab() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasExistingItems, setHasExistingItems] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if current date has existing items
  useEffect(() => {
    const checkExistingItems = async () => {
      try {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const response = await fetch(`/api/food-logs?date=${dateString}`);
        const data = await response.json();
        setHasExistingItems(data.items && data.items.length > 0);
      } catch (error) {
        console.error('Error checking existing items:', error);
        setHasExistingItems(false);
      }
    };
    checkExistingItems();
  }, [selectedDate]);

  const handleTemplateImported = () => {
    // Trigger refresh of FoodLogView by changing key
    setRefreshKey(prev => prev + 1);
    // Also update hasExistingItems
    setHasExistingItems(true);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Nutrition Tracker</h2>
        <p className="text-muted-foreground">Track your daily food intake and nutrition</p>
      </div>

      <Tabs defaultValue="log" className="space-y-6">
        <TabsList>
          <TabsTrigger value="log">Food Log</TabsTrigger>
          <TabsTrigger value="myfood">My Food</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-6">
          <FoodLogView
            key={refreshKey}
            date={selectedDate}
            onDateChange={setSelectedDate}
          />
        </TabsContent>

        <TabsContent value="myfood" className="space-y-6">
          <MyFoodTab />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <FoodTemplateManager
            currentDate={selectedDate}
            hasExistingItems={hasExistingItems}
            onTemplateImported={handleTemplateImported}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}


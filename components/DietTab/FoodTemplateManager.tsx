'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { FoodTemplate } from './types';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface FoodTemplateManagerProps {
  onSelectTemplate: (template: FoodTemplate) => void;
  currentDate: Date;
  hasExistingItems: boolean;
}

export function FoodTemplateManager({ onSelectTemplate, currentDate, hasExistingItems }: FoodTemplateManagerProps) {
  const [templates, setTemplates] = useState<FoodTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);
  const [importWarningOpen, setImportWarningOpen] = useState(false);
  const [templateToImport, setTemplateToImport] = useState<FoodTemplate | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/food-templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = (template: FoodTemplate) => {
    if (hasExistingItems) {
      setTemplateToImport(template);
      setImportWarningOpen(true);
    } else {
      handleImportTemplate(template);
    }
  };

  const handleImportTemplate = async (template: FoodTemplate) => {
    setImporting(true);
    try {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const response = await fetch('/api/food-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateString,
          items: template.items,
        }),
      });

      if (response.ok) {
        setImportWarningOpen(false);
        setTemplateToImport(null);
        // Trigger a refresh by calling onSelectTemplate
        onSelectTemplate(template);
      }
    } catch (error) {
      console.error('Error importing:', error);
    } finally {
      setImporting(false);
    }

  const handleDeleteClick = (id: string, name: string) => {
    setTemplateToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      const response = await fetch(`/api/food-templates/${templateToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  if (loading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Food Templates</h3>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No templates yet. Create one to quickly add frequently eaten foods.
        </p>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {template.items.length} item{template.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectTemplate(template)}
                  >
                    Use
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(template.id, template.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Food Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., My Breakfast, Post-Workout Meal"
              />
            </div>
            <FoodLogEntryForm
              items={[]}
              onSave={(items) => setTemplateItems(items)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={saving || !templateName.trim() || templateItems.length === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Template'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete template?"
        description={`Are you sure you want to delete the template "${templateToDelete?.name}"? This action cannot be undone.`}
        itemName={templateToDelete?.name}
      />
    </div>
  );
}


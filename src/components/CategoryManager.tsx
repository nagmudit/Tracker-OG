"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useExpense } from "@/context/ExpenseContext";
import { categoryColorTokens, tokenToCssVar } from "@/utils/theme-colors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Category } from "@/types/expense";

const CategoryManager: React.FC = () => {
  const { categories, addCategory, deleteCategory } = useExpense();
  const [isOpen, setIsOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "chart-1",
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCategory.name.trim()) return;

    addCategory({
      name: newCategory.name.trim(),
      color: newCategory.color,
      isDefault: false,
    });

    setNewCategory({ name: "", color: "chart-1" });
    setIsOpen(false);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    await deleteCategory(deletingCategory.id);
    setDeletingCategory(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">Library</p>
          <h2 className="text-3xl font-semibold text-foreground">Categories</h2>
        </div>
        <Button type="button" onClick={() => setIsOpen(true)}>
          <Plus data-icon="inline-start" />
          Add category
        </Button>
      </header>

      <Card className="shadow">
        <CardHeader>
          <CardTitle>Category tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y divide-border">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  className="size-4 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: tokenToCssVar(category.color) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {category.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{category.color}</p>
                </div>
                <Badge variant={category.isDefault ? "secondary" : "outline"}>
                  {category.isDefault ? "Default" : "Custom"}
                </Badge>
                {!category.isDefault && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeletingCategory(category)}
                  >
                    <Trash2 />
                    <span className="sr-only">Delete category</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>
              Pick a reusable theme token so charts stay consistent.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="category-name">Name</FieldLabel>
                <Input
                  id="category-name"
                  value={newCategory.name}
                  onChange={(event) =>
                    setNewCategory((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Category name"
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Color</FieldLabel>
                <ToggleGroup
                  value={[newCategory.color]}
                  onValueChange={(value) => {
                    const nextValue = value[0];
                    if (nextValue) {
                      setNewCategory((prev) => ({ ...prev, color: nextValue }));
                    }
                  }}
                  className="grid w-full grid-cols-5 gap-2"
                  variant="outline"
                >
                  {categoryColorTokens.map((color) => (
                    <ToggleGroupItem key={color} value={color} className="h-12 px-1">
                      <span
                        className="size-5 rounded-full border border-border"
                        style={{ backgroundColor: tokenToCssVar(color) }}
                      />
                      <span className="sr-only">{color}</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open) setDeletingCategory(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              Existing transactions keep their saved category name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoryManager;

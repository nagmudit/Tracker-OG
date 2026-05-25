"use client";

import React, { useState } from "react";
import { useExpense } from "@/context/ExpenseContext";
import { categoryColorTokens, tokenToCssVar } from "@/utils/theme-colors";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CategoryManager: React.FC = () => {
  const { categories, addCategory, deleteCategory } = useExpense();
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge variant="secondary">Library</Badge>
          <h2 className="text-3xl font-semibold text-foreground">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Keep entries scannable with theme-based category tokens.
          </p>
        </div>
        <Button type="button" onClick={() => setIsOpen(true)}>
          <Plus />
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => (
          <Card key={category.id} className="shadow">
            <CardHeader>
              <CardTitle className="flex min-w-0 items-center gap-3">
                <span
                  className="size-4 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: tokenToCssVar(category.color) }}
                />
                <span className="truncate">{category.name}</span>
              </CardTitle>
              {!category.isDefault && (
                <CardAction>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteCategory(category.id)}
                  >
                    <X />
                    <span className="sr-only">Delete category</span>
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <Badge variant={category.isDefault ? "secondary" : "outline"}>
                {category.isDefault ? "Default" : "Custom"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Choose a name and one of the global chart color tokens.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategory.name}
                onChange={(event) =>
                  setNewCategory((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Category name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Color Token</Label>
              <div className="grid grid-cols-5 gap-2">
                {categoryColorTokens.map((color) => (
                  <Button
                    key={color}
                    type="button"
                    variant={newCategory.color === color ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setNewCategory((prev) => ({ ...prev, color }))}
                  >
                    <span
                      className="size-5 rounded-full border border-border"
                      style={{ backgroundColor: tokenToCssVar(color) }}
                    />
                    <span className="sr-only">{color}</span>
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Category</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManager;

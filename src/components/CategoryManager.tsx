"use client";

import React, { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Category } from "@/types/expense";

const CategoryManager: React.FC = () => {
  const { categories, addCategory, deleteCategory } = useExpense();
  const [isOpen, setIsOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "chart-1",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCategory.name.trim()) return;

    setIsSaving(true);
    setError("");
    const result = await addCategory({
      name: newCategory.name.trim(),
      color: newCategory.color,
      isDefault: false,
    });
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNewCategory({ name: "", color: "chart-1" });
    setIsOpen(false);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    const result = await deleteCategory(deletingCategory.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDeletingCategory(null);
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">Library</p>
          <h2 className="text-4xl font-bold text-primary sm:text-3xl sm:text-foreground">
            Categories
          </h2>
        </div>
        <Button
          type="button"
          onClick={() => {
            setError("");
            setIsOpen(true);
          }}
        >
          <Plus data-icon="inline-start" />
          Add category
        </Button>
      </header>

        <InputGroup className="h-14 border-transparent bg-muted">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories"
          className="text-lg"
        />
      </InputGroup>

      <Card className="app-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Manage Categories</CardTitle>
          <p className="finance-label text-xs text-muted-foreground">
            {filteredCategories.length} categories
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  {category.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-foreground">
                    {category.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {category.isDefault ? "Default spending group" : "Custom category"}
                  </p>
                </div>
                <span
                  className="size-3 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: tokenToCssVar(category.color) }}
                />
                <Badge variant={category.isDefault ? "secondary" : "outline"} className="hidden sm:inline-flex">
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

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setError("");
        }}
      >
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
              {error && <FieldError role="alert">{error}</FieldError>}
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCategory(null);
            setError("");
          }
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
          {error && <FieldError role="alert">{error}</FieldError>}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setError("")}>Cancel</AlertDialogCancel>
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

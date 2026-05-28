"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Database,
  Download,
  Moon,
  Palette,
  Sun,
  Trash2,
  UserCircle,
} from "lucide-react";
import CategoryManager from "@/components/CategoryManager";
import { useAuth } from "@/context/AuthContext";
import { useExpense } from "@/context/ExpenseContext";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const ProfileManager: React.FC = () => {
  const { user, logout } = useAuth();
  const { clearData, theme, toggleTheme } = useExpense();
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [deleteDataConfirm, setDeleteDataConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const closeDialogs = () => {
    setShowDeleteAccountModal(false);
    setShowDeleteDataModal(false);
    setDeleteAccountConfirm("");
    setDeleteDataConfirm("");
    setError("");
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm.toLowerCase() !== "delete") {
      setError('Please type "delete" to confirm.');
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      logout();
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (deleteDataConfirm.toLowerCase() !== "delete") {
      setError('Please type "delete" to confirm.');
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/delete-data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete data");
      }

      clearData();
      closeDialogs();
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">Account</p>
        <h1 className="text-4xl font-bold text-primary sm:text-3xl sm:text-foreground">
          Money Log
        </h1>
      </header>

      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="flex flex-col items-center gap-4 p-0 text-center">
          <div className="relative">
            <Avatar className="size-32 border-4 border-primary">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              className="absolute bottom-0 right-0 rounded-full"
              aria-label="Edit profile"
            >
              <UserCircle />
            </Button>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-3xl font-bold text-foreground">
              {user?.name}
            </h2>
            <p className="break-all text-lg text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="app-card bg-muted/50">
        <CardHeader>
          <CardTitle className="finance-label text-sm text-muted-foreground">
            Security & Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <button type="button" className="flex items-center gap-4 rounded-lg p-3 text-left hover:bg-muted">
            <UserCircle className="text-primary" />
            <span className="flex-1 text-lg font-medium">Account Details</span>
            <ChevronRight className="text-muted-foreground" />
          </button>
          <button type="button" className="flex items-center gap-4 rounded-lg p-3 text-left hover:bg-muted">
            <Bell className="text-primary" />
            <span className="flex-1 text-lg font-medium">Notifications</span>
            <ChevronRight className="text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      <Card className="app-card bg-muted/50">
        <CardHeader>
          <CardTitle className="finance-label text-sm text-muted-foreground">
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            className="flex w-full items-center gap-4 rounded-lg p-3 text-left hover:bg-muted"
            onClick={toggleTheme}
          >
            <Palette className="text-primary" />
            <span className="flex-1 text-lg font-medium">Dark Mode</span>
            <span className="flex h-8 w-14 items-center rounded-full bg-border p-1">
              <span
                className={
                  theme === "dark"
                    ? "ml-6 size-6 rounded-full bg-primary"
                    : "size-6 rounded-full bg-card"
                }
              />
            </span>
            {theme === "light" ? <Moon className="sr-only" /> : <Sun className="sr-only" />}
          </button>
        </CardContent>
      </Card>

      <Card className="app-card bg-muted/50">
        <CardHeader>
          <CardTitle className="finance-label text-sm text-muted-foreground">
            Data & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <button type="button" className="flex items-center gap-4 rounded-lg p-3 text-left hover:bg-muted">
            <Download className="text-primary" />
            <span className="flex-1 text-lg font-medium">Export Data (CSV/PDF)</span>
            <Download className="text-muted-foreground" />
          </button>
          <button
            type="button"
            className="flex items-center gap-4 rounded-lg p-3 text-left text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteDataModal(true)}
          >
            <Database />
            <span className="flex-1 text-lg font-medium">Clear All Data</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-4 rounded-lg p-3 text-left text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteAccountModal(true)}
          >
            <Trash2 />
            <span className="flex-1 text-lg font-medium">Delete Account</span>
          </button>
          <Separator />
          <Button type="button" variant="outline" className="mt-3 w-full" onClick={logout}>
            Logout
          </Button>
        </CardContent>
      </Card>

      <div className="lg:hidden">
        <CategoryManager />
      </div>

      <AlertDialog open={showDeleteAccountModal} onOpenChange={setShowDeleteAccountModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete account</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent. Type delete to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="delete-account-confirm">Confirmation</FieldLabel>
              <Input
                id="delete-account-confirm"
                value={deleteAccountConfirm}
                onChange={(event) => setDeleteAccountConfirm(event.target.value)}
                placeholder="Type delete to confirm"
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialogs}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={loading || deleteAccountConfirm.toLowerCase() !== "delete"}
              onClick={handleDeleteAccount}
            >
              {loading ? "Deleting..." : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDataModal} onOpenChange={setShowDeleteDataModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete all data</AlertDialogTitle>
            <AlertDialogDescription>
              This removes expenses, categories, and history. Type delete to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="delete-data-confirm">Confirmation</FieldLabel>
              <Input
                id="delete-data-confirm"
                value={deleteDataConfirm}
                onChange={(event) => setDeleteDataConfirm(event.target.value)}
                placeholder="Type delete to confirm"
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialogs}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={loading || deleteDataConfirm.toLowerCase() !== "delete"}
              onClick={handleDeleteData}
            >
              {loading ? "Deleting..." : "Delete data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileManager;

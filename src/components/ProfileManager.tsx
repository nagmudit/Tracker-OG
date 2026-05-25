"use client";

import React, { useState } from "react";
import { AlertTriangle, Database, Moon, Sun, Trash2 } from "lucide-react";
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
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">Account</p>
        <h1 className="text-3xl font-semibold text-foreground">Profile</h1>
      </header>

      <Card className="shadow">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-foreground">
                {user?.name}
              </h2>
              <p className="break-all text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="outline" onClick={toggleTheme}>
              {theme === "light" ? (
                <Moon data-icon="inline-start" />
              ) : (
                <Sun data-icon="inline-start" />
              )}
              Theme
            </Button>
            <Button type="button" variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="lg:hidden">
        <CategoryManager />
      </div>

      <Card className="border-destructive shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle />
            Data controls
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium text-foreground">Delete all data</h4>
              <p className="text-sm text-muted-foreground">
                Keep the account and remove transaction history.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDataModal(true)}
            >
              <Database data-icon="inline-start" />
              Delete data
            </Button>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium text-foreground">Delete account</h4>
              <p className="text-sm text-muted-foreground">
                Permanently remove the account and everything in it.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteAccountModal(true)}
            >
              <Trash2 data-icon="inline-start" />
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

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

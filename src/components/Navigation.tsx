"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Home,
  List,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  UserCog,
} from "lucide-react";
import Dashboard from "@/components/Dashboard";
import ExpenseList from "@/components/ExpenseList";
import Analytics from "@/components/Analytics";
import CategoryManager from "@/components/CategoryManager";
import ProfileManager from "@/components/ProfileManager";
import ExpenseForm from "@/components/ExpenseForm";
import { useAuth } from "@/context/AuthContext";
import { useExpense } from "@/context/ExpenseContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const desktopNavItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "transactions", label: "Transactions", icon: List },
  { id: "analytics", label: "Insights", icon: BarChart3 },
  { id: "categories", label: "Categories", icon: Settings },
  { id: "profile", label: "Profile", icon: UserCog },
] as const;

const mobileNavItems = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "transactions", label: "History", icon: List },
  { id: "add", label: "Add", icon: Plus },
  { id: "analytics", label: "Insights", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: UserCog },
] as const;

type AppTab = (typeof desktopNavItems)[number]["id"];

const Navigation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useExpense();

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "transactions":
        return <ExpenseList />;
      case "analytics":
        return <Analytics />;
      case "categories":
        return <CategoryManager />;
      case "profile":
        return <ProfileManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <div className="flex h-full flex-col gap-5 p-5">
          <div className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit">
              Tracker
            </Badge>
            <div>
              <h1 className="text-2xl font-semibold text-sidebar-foreground">
                Money Log
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter fast. Review calmly.
              </p>
            </div>
          </div>

          <Separator className="bg-sidebar-border" />

          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleTheme}
                    />
                  }
                >
                  {theme === "light" ? <Moon /> : <Sun />}
                  <span className="sr-only">Toggle theme</span>
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon data-icon="inline-start" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            <Button
              type="button"
              className="w-full justify-start"
              onClick={() => setIsExpenseFormOpen(true)}
            >
              <Plus data-icon="inline-start" />
              Add transaction
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={logout}
            >
              <LogOut data-icon="inline-start" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-72">
        <div className="mx-auto flex max-w-6xl flex-col px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          {renderContent()}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-lg backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isAdd = item.id === "add";
            const isActive = activeTab === item.id;

            return (
              <Button
                key={item.id}
                type="button"
                variant={isAdd || isActive ? "default" : "ghost"}
                className="flex min-h-14 flex-col gap-1 rounded-lg px-1 text-xs"
                onClick={() => {
                  if (isAdd) {
                    setIsExpenseFormOpen(true);
                    return;
                  }
                  setActiveTab(item.id as AppTab);
                }}
              >
                <Icon />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>

      <ExpenseForm
        open={isExpenseFormOpen}
        onOpenChange={setIsExpenseFormOpen}
        hideTrigger
      />
    </div>
  );
};

export default Navigation;

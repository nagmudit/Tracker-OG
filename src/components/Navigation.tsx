"use client";

import React, { useState } from "react";
import {
  BarChart3,
  CalendarClock,
  HandCoins,
  Home,
  List,
  LogOut,
  MoreHorizontal,
  Moon,
  Plus,
  Settings,
  Sun,
  UserCog,
  FileSpreadsheet,
} from "lucide-react";
import Dashboard from "@/components/Dashboard";
import ExpenseList from "@/components/ExpenseList";
import Analytics from "@/components/Analytics";
import CategoryManager from "@/components/CategoryManager";
import ProfileManager from "@/components/ProfileManager";
import ExpenseForm from "@/components/ExpenseForm";
import ScheduledTransactions from "@/components/ScheduledTransactions";
import SplitBills from "@/components/SplitBills";
import { TransactionImporter } from "@/components/TransactionImporter";
import { useAuth } from "@/context/AuthContext";
import { useExpense } from "@/context/ExpenseContext";
import { Expense } from "@/types/expense";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const desktopNavItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "transactions", label: "Transactions", icon: List },
  { id: "scheduled", label: "Scheduled", icon: CalendarClock },
  { id: "split", label: "Split Bills", icon: HandCoins },
  { id: "analytics", label: "Insights", icon: BarChart3 },
  { id: "categories", label: "Categories", icon: Settings },
  { id: "profile", label: "Profile", icon: UserCog },
] as const;

const mobileNavItems = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "transactions", label: "History", icon: List },
  { id: "add", label: "Add", icon: Plus },
  { id: "analytics", label: "Insights", icon: BarChart3 },
  { id: "more", label: "More", icon: MoreHorizontal },
] as const;

const mobileMoreItems = [
  {
    id: "scheduled",
    label: "Scheduled",
    description: "Recurring entries",
    icon: CalendarClock,
  },
  {
    id: "split",
    label: "Split Bills",
    description: "Shared expenses",
    icon: HandCoins,
  },
  {
    id: "categories",
    label: "Categories",
    description: "Spending groups",
    icon: Settings,
  },
  {
    id: "profile",
    label: "Profile",
    description: "Account and data",
    icon: UserCog,
  },
  {
    id: "import",
    label: "Import Data",
    description: "Upload UPI CSV/Excel",
    icon: FileSpreadsheet,
  },
] as const;

type AppTab = (typeof desktopNavItems)[number]["id"];

const Navigation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Expense | null>(
    null,
  );
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useExpense();

  React.useEffect(() => {
    const handleEditTransaction = (event: Event) => {
      const transaction = (event as CustomEvent<Expense>).detail;
      if (!transaction) return;

      setEditingTransaction(transaction);
      setActiveTab("transactions");
    };

    window.addEventListener(
      "money-log:edit-transaction",
      handleEditTransaction,
    );
    return () => {
      window.removeEventListener(
        "money-log:edit-transaction",
        handleEditTransaction,
      );
    };
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const moreTabIds = mobileMoreItems.map((item) => item.id) as string[];
  const isMoreActive = moreTabIds.includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            onAddTransaction={() => setIsExpenseFormOpen(true)}
            onViewTransactions={() => setActiveTab("transactions")}
          />
        );
      case "transactions":
        return <ExpenseList />;
      case "scheduled":
        return <ScheduledTransactions />;
      case "split":
        return <SplitBills />;
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
        <div className="flex h-full flex-col gap-7 p-6">
          <div className="flex flex-col gap-1">
            <div>
              <h1 className="text-3xl font-bold text-primary">Money Log</h1>
              <p className="text-sm text-muted-foreground">Wealth Management</p>
            </div>
          </div>

          <Separator className="bg-sidebar-border" />

          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3">
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
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
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

          <nav className="flex flex-col gap-2">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant={isActive ? "default" : "ghost"}
                  className="h-12 w-full justify-start rounded-lg text-base"
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
              size="lg"
              className="w-full justify-start"
              onClick={() => setIsExpenseFormOpen(true)}
            >
              <Plus data-icon="inline-start" />
              Add transaction
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full justify-start"
              onClick={() => setIsImporterOpen(true)}
            >
              <FileSpreadsheet data-icon="inline-start" />
              Import UPI
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start border-transparent bg-transparent text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut data-icon="inline-start" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-72">
        <div className="mx-auto flex max-w-7xl flex-col px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-9">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Welcome back,</p>
                <p className="truncate text-xl font-semibold text-foreground">
                  {user?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon /> : <Sun />}
              </Button>
            </div>
          </div>
          {renderContent()}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-accent/90 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 shadow-lg backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isAdd = item.id === "add";
            const isMore = item.id === "more";
            const isActive = activeTab === item.id || (isMore && isMoreActive);

            return (
              <Button
                key={item.id}
                type="button"
                variant={isAdd || isActive ? "default" : "ghost"}
                className={
                  isAdd
                    ? "mx-auto flex size-16 -translate-y-3 flex-col gap-0 rounded-2xl shadow-lg shadow-primary/20"
                    : "flex h-16 flex-col gap-1 rounded-lg px-1 text-xs"
                }
                onClick={() => {
                  if (isAdd) {
                    setIsExpenseFormOpen(true);
                    return;
                  }
                  if (isMore) {
                    setIsMoreOpen(true);
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

      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[80dvh] max-w-xl rounded-t-3xl border-border lg:hidden"
        >
          <SheetHeader className="text-left">
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">
              Access the same sections available on desktop.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {mobileMoreItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant={isActive ? "default" : "ghost"}
                  className="h-auto justify-start gap-3 rounded-lg p-4 text-left"
                  onClick={() => {
                    if (item.id === "import") {
                      setIsImporterOpen(true);
                    } else {
                      setActiveTab(item.id as AppTab);
                    }
                    setIsMoreOpen(false);
                  }}
                >
                  <Icon data-icon="inline-start" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-semibold">
                      {item.label}
                    </span>
                    <span className="truncate text-xs font-normal opacity-75">
                      {item.description}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <ExpenseForm
        open={isExpenseFormOpen}
        onOpenChange={setIsExpenseFormOpen}
        hideTrigger
      />

      <ExpenseForm
        open={Boolean(editingTransaction)}
        onOpenChange={(open) => {
          if (!open) setEditingTransaction(null);
        }}
        expense={editingTransaction}
        hideTrigger
        onSaved={() => setEditingTransaction(null)}
      />

      <TransactionImporter
        open={isImporterOpen}
        onOpenChange={setIsImporterOpen}
      />
    </div>
  );
};

export default Navigation;

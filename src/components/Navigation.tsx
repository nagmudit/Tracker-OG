"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Home,
  List,
  LogOut,
  Menu,
  Plus,
  Settings,
  UserCog,
  X,
} from "lucide-react";
import Dashboard from "@/components/Dashboard";
import ExpenseList from "@/components/ExpenseList";
import Analytics from "@/components/Analytics";
import CategoryManager from "@/components/CategoryManager";
import ProfileManager from "@/components/ProfileManager";
import ExpenseForm from "@/components/ExpenseForm";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "transactions", label: "Transactions", icon: List },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "categories", label: "Categories", icon: Settings },
  { id: "profile", label: "Profile", icon: UserCog },
];

const mobileNavItems = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "transactions", label: "History", icon: List },
  { id: "add", label: "Add", icon: Plus },
  { id: "analytics", label: "Insights", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: UserCog },
];

const Navigation: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const { user, logout } = useAuth();

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

  const NavButton = ({
    item,
    compact = false,
  }: {
    item: (typeof navItems)[number];
    compact?: boolean;
  }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <Button
        type="button"
        variant={isActive ? "secondary" : "ghost"}
        className={`w-full justify-start ${compact ? "px-3" : ""}`}
        onClick={() => {
          setActiveTab(item.id);
          setIsMobileMenuOpen(false);
        }}
      >
        <Icon />
        {!compact && <span>{item.label}</span>}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
          <span className="sr-only">Toggle navigation</span>
        </Button>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-5">
          <div className="space-y-1">
            <Badge variant="secondary" className="w-fit">
              Personal finance
            </Badge>
            <h1 className="text-2xl font-semibold text-sidebar-foreground">
              Expense Tracker
            </h1>
            <p className="text-sm text-muted-foreground">
              Fast entries, cleaner decisions.
            </p>
          </div>

          <Separator className="my-5 bg-sidebar-border" />

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
                      onClick={logout}
                    />
                  }
                >
                  <LogOut />
                  <span className="sr-only">Logout</span>
                </TooltipTrigger>
                <TooltipContent>Logout</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <NavButton key={item.id} item={item} />
            ))}
          </nav>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="lg:ml-72">
        <div className="p-4 pt-16 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          {renderContent()}
        </div>
      </main>

      <Button
        type="button"
        className="fixed bottom-6 right-6 z-40 hidden h-12 rounded-full px-5 shadow-lg lg:inline-flex"
        onClick={() => setIsExpenseFormOpen(true)}
      >
        <Plus />
        Add
      </Button>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-2 pt-1 shadow-lg backdrop-blur lg:hidden">
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
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
              >
                <Icon className={isAdd ? "size-5" : "size-4"} />
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

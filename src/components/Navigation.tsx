"use client";

import React, { useState } from "react";
import {
  Home,
  List,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  UserCog,
} from "lucide-react";
import Dashboard from "@/components/Dashboard";
import ExpenseList from "@/components/ExpenseList";
import Analytics from "@/components/Analytics";
import CategoryManager from "@/components/CategoryManager";
import ProfileManager from "@/components/ProfileManager";
import ExpenseForm from "@/components/ExpenseForm";
import { useAuth } from "@/context/AuthContext";

const Navigation: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "transactions", label: "Transactions", icon: List },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "categories", label: "Categories", icon: Settings },
    { id: "profile", label: "Profile", icon: UserCog },
  ];

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Expense Tracker
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your finances
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-500 dark:bg-green-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <nav className="mt-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  activeTab === item.id
                    ? "bg-pink-50 dark:bg-green-900 text-pink-600 dark:text-green-400 border-r-2 border-pink-500 dark:border-green-500"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8">{renderContent()}</div>
      </div>

      {/* Floating Action Button */}
      <ExpenseForm />
    </div>
  );
};

export default Navigation;

"use client";

import React, { useState } from "react";
import { Trash2, Database, User, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ProfileManager: React.FC = () => {
  const { user, logout } = useAuth();
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [deleteDataConfirm, setDeleteDataConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm.toLowerCase() !== "delete") {
      setError('Please type "delete" to confirm');
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

      // Account deleted successfully, log out user
      logout();
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (deleteDataConfirm.toLowerCase() !== "delete") {
      setError('Please type "delete" to confirm');
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

      // Data deleted successfully, close modal
      setShowDeleteDataModal(false);
      setDeleteDataConfirm("");
      window.location.reload(); // Refresh to show empty state
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Profile Settings
        </h1>

        {/* User Info */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-16 h-16 bg-pink-500 dark:bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {user?.name}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-all">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-t pt-4 sm:pt-6">
          <h3 className="text-base sm:text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            Danger Zone
          </h3>
          <div className="space-y-4">
            {/* Delete Data Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                  Delete All Data
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Remove all your expenses, categories, and transaction history.
                  Your account will remain active.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteDataModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-md transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Database className="w-4 h-4" />
                Delete Data
              </button>
            </div>

            {/* Delete Account Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                  Delete Account
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteAccountModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Account
            </h3>
            <div className="mb-4">
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-400">
                  This action is permanent and cannot be undone. All your data
                  will be lost.
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                To confirm, type <strong>&quot;delete&quot;</strong> in the box
                below:
              </p>
              <input
                type="text"
                value={deleteAccountConfirm}
                onChange={(e) => setDeleteAccountConfirm(e.target.value)}
                placeholder="Type 'delete' to confirm"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
              />
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeleteAccountConfirm("");
                  setError("");
                }}
                className="w-full sm:flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={
                  loading || deleteAccountConfirm.toLowerCase() !== "delete"
                }
                className="w-full sm:flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md transition-colors disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Data Modal */}
      {showDeleteDataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete All Data
            </h3>
            <div className="mb-4">
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-400">
                  This will permanently delete all your expenses, categories,
                  and transaction history.
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                To confirm, type <strong>&quot;delete&quot;</strong> in the box
                below:
              </p>
              <input
                type="text"
                value={deleteDataConfirm}
                onChange={(e) => setDeleteDataConfirm(e.target.value)}
                placeholder="Type 'delete' to confirm"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
              />
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowDeleteDataModal(false);
                  setDeleteDataConfirm("");
                  setError("");
                }}
                className="w-full sm:flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                disabled={
                  loading || deleteDataConfirm.toLowerCase() !== "delete"
                }
                className="w-full sm:flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md transition-colors disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? "Deleting..." : "Delete Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManager;

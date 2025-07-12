"use client";

import React, { useState } from "react";
import { useExpense } from "@/context/ExpenseContext";
import { Plus, X } from "lucide-react";

const ExpenseForm: React.FC = () => {
  const { addExpense, categories, theme } = useExpense();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    paymentMethod: "cash" as const,
    transactionType: "debit" as const,
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) return;

    addExpense({
      amount: parseFloat(formData.amount),
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      transactionType: formData.transactionType,
      description: formData.description,
      date: formData.date,
    });

    setFormData({
      amount: "",
      category: "",
      paymentMethod: "cash",
      transactionType: "debit",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsOpen(false);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getButtonColors = () => {
    return theme === "dark"
      ? "bg-green-500 hover:bg-green-600 dark:bg-green-500 dark:hover:bg-green-600"
      : "bg-pink-500 hover:bg-pink-600 dark:bg-green-500 dark:hover:bg-green-600";
  };

  const getFocusColors = () => {
    return theme === "dark"
      ? "focus:ring-green-500 dark:focus:ring-green-500"
      : "focus:ring-pink-500 dark:focus:ring-green-500";
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 ${getButtonColors()} text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-lg transition-colors z-50`}
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Add Transaction
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Enter amount"
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 ${getFocusColors()} dark:bg-gray-700 dark:text-white`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 ${getFocusColors()} dark:bg-gray-700 dark:text-white`}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 ${getFocusColors()} dark:bg-gray-700 dark:text-white`}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="credit-card">Credit Card</option>
                  <option value="debit-card">Debit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Type
                </label>
                <select
                  name="transactionType"
                  value={formData.transactionType}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 ${getFocusColors()} dark:bg-gray-700 dark:text-white`}
                >
                  <option value="debit">Expense</option>
                  <option value="credit">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 ${getFocusColors()} dark:bg-gray-700 dark:text-white`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter description"
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 ${getFocusColors()} dark:bg-gray-700 dark:text-white resize-none`}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 ${getButtonColors()} text-white rounded-md transition-colors`}
                >
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpenseForm;

"use client";

import { ExpenseProvider } from "@/context/ExpenseContext";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <ExpenseProvider>
      <Navigation />
    </ExpenseProvider>
  );
}

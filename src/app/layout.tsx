import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Money Log - Personal Finance Tracker",
  description:
    "A comprehensive expense tracking application with interactive analytics, category management, and beautiful visualizations. Track your income and expenses with support for multiple payment methods and custom categories.",
  keywords: [
    "expense tracker",
    "budget management",
    "financial app",
    "money tracking",
    "personal finance",
  ],
  authors: [{ name: "Expense Tracker Team" }],
  creator: "Expense Tracker App",
  publisher: "Expense Tracker",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Expense Tracker - Smart Financial Management",
    description:
      "Track your expenses and manage your budget with interactive analytics and beautiful visualizations",
    url: "/",
    siteName: "Expense Tracker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Expense Tracker - Smart Financial Management",
    description:
      "Track your expenses and manage your budget with interactive analytics",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <TooltipProvider>
          <AuthProvider>
            <ExpenseProvider>{children}</ExpenseProvider>
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

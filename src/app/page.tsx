"use client";

import { useAuth } from "@/context/AuthContext";
import Navigation from "@/components/Navigation";
import AuthForm from "@/components/AuthForm";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const { user, login, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-xs shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onLogin={login} />;
  }

  return <Navigation />;
}

"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Lock, Mail, Moon, Sun, User } from "lucide-react";
import { useExpense } from "@/context/ExpenseContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuthFormProps {
  onLogin: (user: { id: number; email: string; name: string }) => void;
}

const securityQuestions = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was the name of your first school?",
  "What is your favorite movie?",
  "What was the make of your first car?",
  "What is your favorite book?",
  "What is your father's middle name?",
];

function Message({ type, text }: { type: "error" | "success"; text: string }) {
  return (
    <Card
      size="sm"
      className={
        type === "error"
          ? "border-destructive bg-destructive/10 text-destructive"
          : "border-secondary bg-secondary/30 text-secondary-foreground"
      }
    >
      <CardContent className="py-2 text-sm">{text}</CardContent>
    </Card>
  );
}

function PasswordInput({
  id,
  name,
  value,
  placeholder,
  show,
  setShow,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  placeholder: string;
  show: boolean;
  setShow: (show: boolean) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        required
        className="pl-9 pr-10"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-1 top-1/2 -translate-y-1/2"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff /> : <Eye />}
        <span className="sr-only">Toggle password visibility</span>
      </Button>
    </div>
  );
}

function ThemeSwitch() {
  const { theme, toggleTheme } = useExpense();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className="absolute right-4 top-4"
      onClick={toggleTheme}
    >
      {theme === "light" ? <Moon /> : <Sun />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    securityQuestion: "",
    securityAnswer: "",
  });

  const [resetData, setResetData] = useState({
    email: "",
    securityAnswer: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setResetData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      securityQuestion: "",
      securityAnswer: "",
    });
    setResetData({
      email: "",
      securityAnswer: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setError("");
    setSuccess("");
    setShowForgotPassword(false);
    setShowResetForm(false);
    setSecurityQuestion("");
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Login failed");

        onLogin(data.user);
        setSuccess("Login successful.");
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            securityQuestion: formData.securityQuestion,
            securityAnswer: formData.securityAnswer,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Signup failed");

        onLogin(data.user);
        setSuccess("Account created successfully.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetData.email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to retrieve security question");
      }

      if (!data.securityQuestion) {
        setSuccess("If an account exists for that email, reset details are available.");
        return;
      }

      setSecurityQuestion(data.securityQuestion);
      setShowResetForm(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    if (resetData.newPassword !== resetData.confirmNewPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetData.email,
          securityAnswer: resetData.securityAnswer,
          newPassword: resetData.newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reset password");

      setSuccess("Password reset successfully. You can now sign in.");
      setShowForgotPassword(false);
      setShowResetForm(false);
      setResetData({
        email: "",
        securityAnswer: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setSecurityQuestion("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <ThemeSwitch />
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>{showResetForm ? "Reset Password" : "Forgot Password"}</CardTitle>
            <CardDescription>
              {showResetForm
                ? "Answer your security question to choose a new password."
                : "Enter your email to retrieve your security question."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showResetForm ? (
              <form className="flex flex-col gap-4" onSubmit={handleForgotPassword}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      required
                      className="pl-9"
                      placeholder="you@example.com"
                      value={resetData.email}
                      onChange={handleResetInputChange}
                    />
                  </div>
                </div>

                {error && <Message type="error" text={error} />}
                {success && <Message type="success" text={success} />}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Processing..." : "Get Security Question"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Back to Sign In
                </Button>
              </form>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={handleResetPassword}>
                <Card size="sm" className="bg-muted/40">
                  <CardContent className="py-3 text-sm">{securityQuestion}</CardContent>
                </Card>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="security-answer">Security Answer</Label>
                  <Input
                    id="security-answer"
                    name="securityAnswer"
                    required
                    placeholder="Your answer"
                    value={resetData.securityAnswer}
                    onChange={handleResetInputChange}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    required
                    placeholder="New password"
                    value={resetData.newPassword}
                    onChange={handleResetInputChange}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    name="confirmNewPassword"
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={resetData.confirmNewPassword}
                    onChange={handleResetInputChange}
                  />
                </div>

                {error && <Message type="error" text={error} />}
                {success && <Message type="success" text={success} />}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowResetForm(false);
                    setShowForgotPassword(false);
                    setSecurityQuestion("");
                  }}
                >
                  Cancel
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <ThemeSwitch />
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>{isLogin ? "Sign in" : "Create account"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Access your expense tracker."
              : "Set up your account and recovery question."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    required
                    className="pl-9"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="pl-9"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                placeholder="Password"
                show={showPassword}
                setShow={setShowPassword}
                onChange={handleInputChange}
              />
            </div>

            {!isLogin && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    placeholder="Confirm password"
                    show={showConfirmPassword}
                    setShow={setShowConfirmPassword}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Security Question</Label>
                  <Select
                    value={formData.securityQuestion}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        securityQuestion: value || "",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a security question" />
                    </SelectTrigger>
                    <SelectContent>
                      {securityQuestions.map((question) => (
                        <SelectItem key={question} value={question}>
                          {question}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="securityAnswer">Security Answer</Label>
                  <Input
                    id="securityAnswer"
                    name="securityAnswer"
                    required
                    placeholder="Your answer"
                    value={formData.securityAnswer}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}

            {error && <Message type="error" text={error} />}
            {success && <Message type="success" text={success} />}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="ghost" onClick={toggleMode}>
                {isLogin ? "Create account" : "Sign in instead"}
              </Button>
              {isLogin && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;

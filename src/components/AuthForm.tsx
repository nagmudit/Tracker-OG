"use client";

import React, { useState } from "react";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";

interface AuthFormProps {
  onLogin: (user: { id: number; email: string; name: string }) => void;
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        // Login logic
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Login failed");
        }

        onLogin(data.user);
        setSuccess("Login successful!");
      } else {
        // Signup logic
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        if (!formData.securityQuestion || !formData.securityAnswer.trim()) {
          throw new Error(
            "Please select a security question and provide an answer"
          );
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

        if (!response.ok) {
          throw new Error(data.error || "Signup failed");
        }

        onLogin(data.user);
        setSuccess("Account created successfully!");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

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

      setSecurityQuestion(data.securityQuestion);
      setShowResetForm(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (resetData.newPassword !== resetData.confirmNewPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

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

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(
        "Password reset successfully! You can now log in with your new password."
      );
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
    setIsLogin(!isLogin);
    resetForm();
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div>
            <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {showResetForm ? "Reset Password" : "Forgot Password"}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {showResetForm
                ? "Answer your security question to reset your password"
                : "Enter your email to retrieve your security question"}
            </p>
          </div>

          {!showResetForm ? (
            <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="reset-email" className="sr-only">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="reset-email"
                      name="email"
                      type="email"
                      required
                      className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                      placeholder="Email address"
                      value={resetData.email}
                      onChange={handleResetInputChange}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Get Security Question"}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-pink-600 hover:text-pink-500 dark:text-green-400 dark:hover:text-green-300"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
              <div className="rounded-md shadow-sm space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Security Question:
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                    {securityQuestion}
                  </p>
                </div>

                <div>
                  <label htmlFor="security-answer" className="sr-only">
                    Security Answer
                  </label>
                  <input
                    id="security-answer"
                    name="securityAnswer"
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                    placeholder="Your answer"
                    value={resetData.securityAnswer}
                    onChange={handleResetInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="new-password" className="sr-only">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                    placeholder="New password"
                    value={resetData.newPassword}
                    onChange={handleResetInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="confirm-new-password" className="sr-only">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-new-password"
                    name="confirmNewPassword"
                    type="password"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm new password"
                    value={resetData.confirmNewPassword}
                    onChange={handleResetInputChange}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                  <div className="text-sm text-green-700 dark:text-green-400">
                    {success}
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(false);
                    setShowForgotPassword(false);
                    setResetData({
                      email: "",
                      securityAnswer: "",
                      newPassword: "",
                      confirmNewPassword: "",
                    });
                    setSecurityQuestion("");
                  }}
                  className="text-sm text-pink-600 hover:text-pink-500 dark:text-green-400 dark:hover:text-green-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isLogin
              ? "Enter your details to access your expense tracker"
              : "Set up your account to start tracking expenses"}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="securityQuestion"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Security Question
                  </label>
                  <select
                    id="securityQuestion"
                    name="securityQuestion"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                    value={formData.securityQuestion}
                    onChange={handleInputChange}
                  >
                    <option value="">Select a security question</option>
                    {securityQuestions.map((question, index) => (
                      <option key={index} value={question}>
                        {question}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="securityAnswer" className="sr-only">
                    Security Answer
                  </label>
                  <input
                    id="securityAnswer"
                    name="securityAnswer"
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:focus:ring-green-500 dark:focus:border-green-500 focus:z-10 sm:text-sm"
                    placeholder="Your answer to the security question"
                    value={formData.securityAnswer}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <div className="text-sm text-green-700 dark:text-green-400">
                {success}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-pink-600 hover:text-pink-500 dark:text-green-400 dark:hover:text-green-300"
            >
              {isLogin
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>

            {isLogin && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-pink-600 hover:text-pink-500 dark:text-green-400 dark:hover:text-green-300"
              >
                Forgot password?
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthForm;

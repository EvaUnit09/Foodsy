"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Card, CardContent } from "@/components/card";
import { useAuth } from "@/contexts/AuthContext";
import { ApiClient, ApiError } from "@/api/client";
import { AuthHeader } from "@/components/AuthHeader";

const SignInPage = () => {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const disabled = !email || !password || submitting;

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = await ApiClient.auth.login({ 
        emailOrUsername: email, 
        password: password 
      });
      
      if (data.success && data.user) {
        // Use the auth context to sign in
        signIn(data.user);
        
        // Navigate to home page
        router.push("/");
      } else {
        throw new Error(data.message || "Sign in failed");
      }

    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : (err as Error).message;
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${backendUrl}/oauth2/authorization/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <AuthHeader />

      {/* Sign In Form */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome Back!
            </h1>
            <p className="text-lg text-gray-600">
              Sign in to your account to create sessions and save your food preferences
            </p>
          </div>

          <Card className="shadow-xl border-2 border-orange-600 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              {/* Google Sign In Button */}
              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                size="lg"
                className="w-full h-12 mb-6 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285f4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34a853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#fbbc05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#ea4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Email/Password Sign In Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="email"
                      type="text"
                      placeholder="Enter your email or username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-lg border-gray-200 focus:border-orange-300 pl-11"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-lg border-gray-200 focus:border-orange-300 pl-11"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={disabled}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {submitting ? "Signing In…" : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/signup"
                    className="text-orange-600 hover:text-orange-500 font-medium"
                  >
                    Sign up here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-sm text-gray-500">
            Sign in to access your dining preferences and join voting sessions with friends!
          </p>
        </div>
      </section>
    </div>
  );
};

export default SignInPage;
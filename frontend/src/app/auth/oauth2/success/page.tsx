"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const OAuth2SuccessPage = () => {
  const router = useRouter();
  const { signIn } = useAuth();

  useEffect(() => {
    const handleOAuth2Success = async () => {
      try {
        // Fetch user data from backend after OAuth2 login
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const response = await fetch(`${backendUrl}/auth/me`, {
          method: "GET",
          credentials: "include", // Include cookies for session
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Sign in the user using our auth context
          signIn(userData);
          
          // Redirect to home page
          router.push("/");
        } else {
          // If failed to get user data, redirect to sign in page
          router.push("/auth/signin");
        }
      } catch (error) {
        console.error("OAuth2 success handling failed:", error);
        router.push("/auth/signin");
      }
    };

    handleOAuth2Success();
  }, [router, signIn]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Completing Sign In...</h1>
        <p className="text-gray-600">Please wait while we finish setting up your account.</p>
      </div>
    </div>
  );
};

export default OAuth2SuccessPage;
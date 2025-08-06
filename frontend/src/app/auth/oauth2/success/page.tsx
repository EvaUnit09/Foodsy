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
        console.log("OAuth2 success page: Starting authentication check");
        
        // Fetch user data from backend after OAuth2 login
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        console.log("OAuth2 success page: Backend URL:", backendUrl);
        
        const response = await fetch(`${backendUrl}/auth/me`, {
          method: "GET",
          credentials: "include", // Include cookies for session
        });

        console.log("OAuth2 success page: Response status:", response.status);
        console.log("OAuth2 success page: Response ok:", response.ok);

        if (response.ok) {
          const userData = await response.json();
          console.log("OAuth2 success page: User data received:", userData);
          
          // Sign in the user using our auth context
          signIn(userData);
          console.log("OAuth2 success page: User signed in, redirecting to home");
          
          // Redirect to home page
          router.push("/");
        } else {
          console.error("OAuth2 success page: Failed to get user data, status:", response.status);
          // If failed to get user data, redirect to home page
          router.push("/");
        }
      } catch (error) {
        console.error("OAuth2 success handling failed:", error);
        router.push("/");
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
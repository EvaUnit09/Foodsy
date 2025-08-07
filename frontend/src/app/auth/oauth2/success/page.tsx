"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClient } from "@/api/client";

export default function OAuth2SuccessPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuth2Success = async () => {
      console.log("OAuth2 success page: Starting authentication check");
      
      try {
        // Add a small delay to ensure cookies are set
        console.log("OAuth2 success page: Waiting for cookies to be set...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 1: Try to refresh the token first
        console.log("OAuth2 success page: Attempting to refresh token...");
        const refreshResponse = await ApiClient.auth.refreshToken();
        console.log("OAuth2 success page: Refresh token response:", refreshResponse);
        
        // Step 2: If refresh successful, get user data
        console.log("OAuth2 success page: Getting user data...");
        const userData = await ApiClient.auth.me();
        console.log("OAuth2 success page: User data received:", userData);
        
        // Step 3: Redirect to homepage with authenticated user
        console.log("OAuth2 success page: Authentication successful, redirecting to homepage");
        router.push("/");
        
      } catch (error) {
        console.error("OAuth2 success page: Authentication failed:", error);
        
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Authentication failed. Please try again.");
        }
        
        // Redirect to homepage on error (user can try logging in again)
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };

    handleOAuth2Success();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Completing Login...
          </h2>
          <p className="text-gray-500">
            Please wait while we set up your account.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Login Failed
          </h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <p className="text-sm text-gray-400">
            Redirecting to homepage...
          </p>
        </div>
      </div>
    );
  }

  return null;
}
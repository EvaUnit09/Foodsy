"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiClient } from "@/api/client";

function OAuth2SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuth2Success = async () => {
      console.log("OAuth2 success page: Starting authentication check");
      
      try {
        // Get tokens from URL parameters
        const accessToken = searchParams?.get('accessToken');
        const username = searchParams?.get('username');
        
        console.log("OAuth2 success page: Tokens from URL:", { 
          hasAccessToken: !!accessToken, 
          username 
        });
        
        if (!accessToken) {
          throw new Error("Missing access token");
        }
        
        // Store access token in localStorage
        localStorage.setItem('accessToken', accessToken);
        console.log("OAuth2 success page: Access token stored in localStorage");
        
        // Try to get user data directly (don't refresh token immediately)
        console.log("OAuth2 success page: Getting user data...");
        try {
          const userData = await ApiClient.auth.me();
          console.log("OAuth2 success page: User data received:", userData);
          
          // Store user data in localStorage for AuthContext
          localStorage.setItem('user', JSON.stringify(userData));
          console.log("OAuth2 success page: User data stored in localStorage");
          
          // Redirect to homepage with authenticated user (use window.location for full reload)
          console.log("OAuth2 success page: Authentication successful, redirecting to homepage");
          window.location.href = "/";
          
        } catch (meError: any) {
          // If /me fails, try refreshing token
          console.log("OAuth2 success page: /me failed, trying refresh token...");
          try {
            const refreshResponse = await ApiClient.auth.refreshToken();
            console.log("OAuth2 success page: Refresh token response:", refreshResponse);
            
            // Update access token if a new one was provided
            if (refreshResponse.accessToken) {
              localStorage.setItem('accessToken', refreshResponse.accessToken);
              console.log("OAuth2 success page: Updated access token in localStorage");
            }
            
            // Try getting user data again
            const userData = await ApiClient.auth.me();
            console.log("OAuth2 success page: User data received after refresh:", userData);
            
            // Store user data in localStorage for AuthContext
            localStorage.setItem('user', JSON.stringify(userData));
            console.log("OAuth2 success page: User data stored in localStorage");
            
            // Redirect to homepage with authenticated user
            console.log("OAuth2 success page: Authentication successful, redirecting to homepage");
                          window.location.href = "/";
            
          } catch (refreshError: any) {
            // Handle 401 specifically (expected when tokens are invalid)
            if (refreshError.status === 401) {
              console.log("OAuth2 success page: 401 from refresh - tokens may be invalid");
              throw new Error("Authentication failed: Invalid or expired tokens");
            } else {
              console.error("OAuth2 success page: Unexpected error during refresh:", refreshError);
              throw refreshError;
            }
          }
        }
        
      } catch (error) {
        console.error("OAuth2 success page: Authentication failed:", error);
        
        // Clear any stored tokens on error
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Authentication failed. Please try again.");
        }
        
        // Redirect to homepage on error (user can try logging in again)
        setTimeout(() => {
                        window.location.href = "/";
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };

    handleOAuth2Success();
  }, [router, searchParams]);

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

export default function OAuth2SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <OAuth2SuccessContent />
    </Suspense>
  );
}
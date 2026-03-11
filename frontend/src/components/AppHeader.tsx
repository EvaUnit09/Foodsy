"use client";

import { Heart, LogOut, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/button";

interface AppHeaderProps {
  /** Badge shown next to the logo. Defaults to "Dashboard" when authenticated. */
  badge?: string;
}

export function AppHeader({ badge }: AppHeaderProps) {
  const router = useRouter();
  const { isAuthenticated, user, signOut } = useAuth();

  const resolvedBadge = badge ?? (isAuthenticated ? "Dashboard" : "NY");

  return (
    <header className="bg-[#fdf6f0] border-b border-[rgba(0,0,0,0.06)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + badge */}
          <div className="flex items-center space-x-4">
            <button
              className="flex items-center space-x-2"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onClick={() => router.push("/")}
            >
              <div className="w-8 h-8 bg-[#e8531a] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span
                className="text-xl font-bold text-[#1a1a1a]"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                Foodsy
              </span>
            </button>
            <span
              className="text-[#444] bg-[#e8e8e8] px-2 py-1 rounded-full"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {resolvedBadge}
            </span>
          </div>

          {/* Nav links */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              Sessions
            </Button>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/discover")}
              >
                Discover
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
            >
              <Heart className="w-4 h-4 mr-2" />
              Favorites
            </Button>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-orange-50 px-3 py-1 rounded-full">
                  <UserIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">
                    {user.displayName}
                  </span>
                </div>
                <Button
                  onClick={signOut}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <button
                className="text-white font-bold cursor-pointer"
                style={{
                  background: "#e8531a",
                  borderRadius: 10,
                  padding: "8px 20px",
                  fontSize: 14,
                  border: "none",
                  boxShadow: "0 4px 14px rgba(232,83,26,0.35)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#c94010")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#e8531a")
                }
                onClick={() =>
                  (window.location.href = `https://apifoodsy-backend.com/oauth2/authorization/google`)
                }
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

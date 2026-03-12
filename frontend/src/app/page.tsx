"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";

import { TrendingCarousel } from "@/components/TrendingCarousel";
import { SocialProofStrip } from "@/components/SocialProofStrip";
import { HowItWorks } from "@/components/HowItWorks";
import { ActivityFeed } from "@/components/ActivityFeed";
import { FinalCTA } from "@/components/FinalCTA";
import { GreetingHeader } from "@/components/GreetingHeader";
import { ActiveSessionBanner } from "@/components/ActiveSessionBanner";
import { DiscoveryEntryCard } from "@/components/DiscoveryEntryCard";
import { FavoritesShelf } from "@/components/FavoritesShelf";
import { WatchlistShelf } from "@/components/WatchlistShelf";
import { useRouter } from "next/navigation";

interface ActiveSessionData {
  sessionId: string;
  participantCount: number;
  restaurantCount: number;
  elapsedMinutes: number;
}

async function fetchActiveSession(): Promise<ActiveSessionData | null> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch("/api/sessions/active", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data) return null;
    const s = json.data;
    return {
      sessionId: s.id ?? s.sessionId,
      participantCount: s.participantCount ?? 0,
      restaurantCount: s.restaurantCount ?? 0,
      elapsedMinutes: s.elapsedMinutes ?? 0,
    };
  } catch {
    return null;
  }
}

const Index = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchActiveSession().then(setActiveSession);
    }
  }, [isAuthenticated]);

  const handleStartSession = () => router.push("/sessions/create");
  const handleJoinSession = () => router.push("/sessions/Joinpage");

  return (
    <div className="min-h-screen bg-[#fdf6f0] flex flex-col">
      <AppHeader />

      <main className="flex-1">

      {isAuthenticated && (
        <>
          <GreetingHeader
            firstName={user?.firstName || user?.displayName || ""}
            onStartSession={handleStartSession}
            onJoinSession={handleJoinSession}
          />
          {activeSession && <ActiveSessionBanner {...activeSession} />}
          <DiscoveryEntryCard />
          <FavoritesShelf
            onStartDiscovery={() => router.push("/discover")}
          />
          <WatchlistShelf onStartDiscovery={() => router.push("/discover")} />
          <TrendingCarousel
            onSignUpPrompt={() => {}}
            isAuthenticated={true}
          />
        </>
      )}

      {!isAuthenticated && (
        <section className="relative px-4 sm:px-8" style={{ padding: "56px 32px 48px" }}>
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="font-extrabold text-[#1a1a1a] mb-4"
              style={{
                fontFamily: "'Georgia', serif",
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 800,
                lineHeight: 1.15,
              }}
            >
              Never Ask
              <span className="text-[#e8531a]">
                {" "}&#34;Where Should We Eat?&#34;{" "}
              </span>
              Again
            </h1>
            <p className="mb-8 max-w-[480px] mx-auto text-[#666666]" style={{ fontSize: 16, lineHeight: 1.6 }}>
              Find restaurants you love, save them to your favorites, then let
              your group vote on tonight&#39;s dinner. No more endless
              back-and-forth!
            </p>
            <button
              className="text-white font-bold cursor-pointer"
              style={{
                background: "#e8531a",
                borderRadius: 10,
                padding: "14px 28px",
                fontSize: 15,
                border: "none",
                boxShadow: "0 4px 14px rgba(232,83,26,0.35)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
              onClick={() => setShowSignUpPrompt(true)}
            >
              + Get Started Free
            </button>
          </div>
        </section>
      )}

      {!isAuthenticated && (
        <TrendingCarousel onSignUpPrompt={() => setShowSignUpPrompt(true)} />
      )}
      {!isAuthenticated && <SocialProofStrip />}
      {!isAuthenticated && (
        <HowItWorks onStartSession={() => setShowSignUpPrompt(true)} />
      )}
      {!isAuthenticated && <ActivityFeed />}
      {!isAuthenticated && (
        <FinalCTA onSignUp={() => setShowSignUpPrompt(true)} />
      )}

      {showSignUpPrompt && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSignUpPrompt(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Save Your Favorites</h3>
            <p className="text-gray-600 mb-6">
              Sign up to save favorites and use them in your group voting sessions.
            </p>
            <button
              className="w-full text-white font-bold cursor-pointer mb-3"
              style={{
                background: "#e8531a",
                borderRadius: 10,
                padding: "14px 28px",
                fontSize: 15,
                border: "none",
                boxShadow: "0 4px 14px rgba(232,83,26,0.35)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
              onClick={() => {
                window.location.href = `https://apifoodsy-backend.com/oauth2/authorization/google`;
              }}
            >
              Sign Up with Google
            </button>
            <button
              className="text-sm text-gray-400 hover:text-gray-600"
              onClick={() => setShowSignUpPrompt(false)}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      </main>

      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-[#e8531a] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>Foodsy</span>
          </div>
          <p className="text-gray-400">
            Stop the dinner debate. Start enjoying great meals together.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

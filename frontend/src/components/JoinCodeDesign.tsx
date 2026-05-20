"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { useAuth } from "@/contexts/AuthContext";

const JoinSessionForm = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const disabled = !username || joinCode.length !== 6 || submitting;

  useEffect(() => {
    if (isAuthenticated && user) {
      setUsername(user.username || user.displayName || "");
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const res = await fetch(`/api/sessions/sessions/${joinCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ userName: username }),
        credentials: "include",
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Unable to join session");
      }

      const { sessionId, userId } = await res.json();
      sessionStorage.setItem("userId", userId.trim().toLowerCase());
      router.push(`/sessions/${sessionId}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-14">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">F</span>
              </div>
              <span className="text-base font-semibold text-stone-900">Foodsy</span>
            </div>
          </div>
        </div>
      </header>

      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-stone-900">Join a session</h1>
            <p className="text-sm text-stone-500 mt-1.5">
              Enter your name and the 6-digit code from your host.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-sm font-medium text-stone-700">
                  Your name
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder={isAuthenticated ? "Logged in as…" : "Enter your name"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`h-11 border-stone-200 focus:border-stone-400 ${
                    isAuthenticated && user && username ? "bg-stone-50 text-stone-500" : ""
                  }`}
                  readOnly={!!(isAuthenticated && user && username)}
                  required
                />
                {isAuthenticated && user && username && (
                  <p className="text-xs text-stone-400">Using your account name</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="joinCode" className="block text-sm font-medium text-stone-700">
                  Session code
                </label>
                <Input
                  id="joinCode"
                  type="text"
                  placeholder="6-digit code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().trim())}
                  className="h-11 border-stone-200 focus:border-stone-400 font-mono tracking-widest text-center text-lg"
                  maxLength={6}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={disabled}
                className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-40"
              >
                {submitting ? "Joining…" : "Join session"}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-stone-100">
              <p className="text-sm text-stone-500 text-center">
                Don&apos;t have a code?{" "}
                <Link href="/" className="text-stone-900 font-medium hover:underline">
                  Browse restaurants
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JoinSessionForm;

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Check, Copy as CopyIcon } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Card, CardContent } from "@/components/card";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateSessionPage() {
  const [creatorId, setCreatorId] = useState("");
  const [poolSize, setPoolSize] = useState(20);
  const [roundTime, setRoundTime] = useState(5);
  const [likesPerUser, setLikesPerUser] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [createdSession, setCreatedSession] = useState<{ id: number; joinCode: string } | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Auto-fill username for authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      setCreatorId(user.username || user.displayName || "");
    }
  }, [isAuthenticated, user]);

  const handleCopy = (text: string, type: "code" | "link") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Only include creatorId for guests (not authenticated users)
    const body: any = {
      poolSize,
      roundTime,
      likesPerUser,
    };
    if (!isAuthenticated) {
      body.creatorId = creatorId.trim().toLowerCase();
    }
    const res = await fetch("http://localhost:8080/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    setSubmitting(false);
    if (res.ok) {
      const session = await res.json();
      setCreatedSession({ id: session.id, joinCode: session.joinCode });
    } else {
      alert("Failed to create session");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Foodsie</span>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  NY
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </div>
        </div>
      </header>

      {/* Form Card */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Create a Voting Session
            </h1>
            <p className="text-lg text-gray-600">
              Set up your session and invite friends to vote on tonight&apos;s dinner spot!
            </p>
          </div>

          <Card className="shadow-xl border-2 border-orange-600 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              {createdSession ? (
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Session Created!</h2>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Share this code with friends:</div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="font-mono text-2xl bg-gray-100 px-4 py-2 rounded-lg border border-orange-300">{createdSession.joinCode}</span>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => handleCopy(createdSession.joinCode, "code")}
                        className="flex items-center space-x-1"
                      >
                        {copied === "code" ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <CopyIcon className="w-4 h-4" />
                        )}
                        <span>{copied === "code" ? "Copied" : "Copy"}</span>
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Or share this link:</div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-orange-200">
                        {`${window.location.origin}/sessions/join`}
                      </span>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => handleCopy(`${window.location.origin}/sessions/join`, "link")}
                        className="flex items-center space-x-1"
                      >
                        {copied === "link" ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <CopyIcon className="w-4 h-4" />
                        )}
                        <span>{copied === "link" ? "Copied" : "Copy"}</span>
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    onClick={() => router.push(`/sessions/${createdSession.id}`)}
                  >
                    Enter Voting Room
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateSession} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name
                    </label>
                    <Input
                      type="text"
                      placeholder={isAuthenticated ? "Logged in as..." : "Enter your name"}
                      value={creatorId}
                      onChange={(e) => setCreatorId(e.target.value)}
                      className={`h-12 text-lg border-gray-200 focus:border-orange-300 ${
                        isAuthenticated && user && creatorId ? "bg-gray-50 text-gray-600" : ""
                      }`}
                      readOnly={isAuthenticated && user && creatorId ? true : false}
                      required
                    />
                    {isAuthenticated && user && creatorId && (
                      <p className="text-sm text-gray-500 mt-1">
                        Using your account name. Want to use a different name?{" "}
                        <button
                          type="button"
                          onClick={() => setCreatorId("")}
                          className="text-orange-600 hover:text-orange-500 font-medium"
                        >
                          Click here to change
                        </button>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pool Size
                    </label>
                    <Input
                      type="number"
                      min={2}
                      max={30}
                      value={poolSize}
                      onChange={(e) => setPoolSize(Number(e.target.value))}
                      className="h-12 text-lg border-gray-200 focus:border-orange-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Round Time (minutes)
                    </label>
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      value={roundTime}
                      onChange={(e) => setRoundTime(Number(e.target.value))}
                      className="h-12 text-lg border-gray-200 focus:border-orange-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Likes per User
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={likesPerUser}
                      onChange={(e) => setLikesPerUser(Number(e.target.value))}
                      className="h-12 text-lg border-gray-200 focus:border-orange-300"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {submitting ? "Creating…" : "Start Session"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
          <p className="mt-8 text-center text-sm text-gray-500">
            Once you create a session, you&apos;ll get a code to share with friends!
          </p>
        </div>
      </section>
    </div>
  );
}

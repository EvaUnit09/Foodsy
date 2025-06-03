"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Card, CardContent } from "@/components/card";

const JoinSessionForm = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const disabled = !username || joinCode.length !== 6 || submitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/sessions/${joinCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: username }),
      });

      if (!res.ok) {
        // surface backend validation messages
        const msg = await res.text();
        throw new Error(msg || "Unable to join session");
      }

      const { sessionId, userId } = await res.json();
      // ✅ navigate to the voting screen for this session
      router.push(
        `/sessions/${sessionId}?userId=${encodeURIComponent(userId)}`,
      );
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
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
              Join a Voting Session
            </h1>
            <p className="text-lg text-gray-600">
              Enter your details to join your friends and vote on tonight&apos;s
              dinner spot!
            </p>
          </div>

          <Card className="shadow-xl border-2 border-orange-600 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Your Name
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 text-lg border-gray-200 focus:border-orange-300"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="joinCode"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Session Code
                  </label>
                  <Input
                    id="joinCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(e.target.value.toUpperCase().trim())
                    }
                    className="h-12 text-lg border-gray-200 focus:border-orange-300 font-mono tracking-wider"
                    maxLength={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={disabled}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {submitting ? "Joining…" : "Join Session"}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Don&apos;t have a session code?{" "}
                  <Link
                    href="/"
                    className="text-orange-600 hover:text-orange-500 font-medium"
                  >
                    Start exploring restaurants
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-sm text-gray-500">
            Once you join, you&apos;ll be able to see the restaurant options and
            cast your vote!
          </p>
        </div>
      </section>
    </div>
  );
};

export default JoinSessionForm;

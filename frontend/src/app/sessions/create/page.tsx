"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Check, Copy as CopyIcon, Users, Clock, Zap } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { useAuth } from "@/contexts/AuthContext";
import { ApiClient, SessionRequest, NeighborhoodDto } from "@/api/client";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens"];

type SessionType = "STANDARD" | "OFFLINE" | "EVENT";

export default function CreateSessionPage() {
  const [sessionType, setSessionType] = useState<SessionType>("STANDARD");
  const [diningBorough, setDiningBorough] = useState("");
  const [diningNeighborhood, setDiningNeighborhood] = useState("");
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodDto[]>([]);
  const [expectedParticipants, setExpectedParticipants] = useState(4);
  const [votingDeadline, setVotingDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [createdSession, setCreatedSession] = useState<{ id: string; joinCode: string } | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Pre-fill from user's profile location
  useEffect(() => {
    if (user?.homeBorough) {
      setDiningBorough(user.homeBorough);
      if (user.homeNeighborhood) {
        setDiningNeighborhood(user.homeNeighborhood);
      }
    }
  }, [user]);

  // Fetch neighborhoods when borough changes
  useEffect(() => {
    if (diningBorough) {
      ApiClient.neighborhoods.getByBorough(diningBorough).then(setNeighborhoods).catch(() => setNeighborhoods([]));
    } else {
      setNeighborhoods([]);
    }
  }, [diningBorough]);

  const handleCopy = (text: string, type: "code" | "link") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert("Please sign in to create a session.");
      return;
    }

    setSubmitting(true);

    const body: SessionRequest = {
      sessionType,
      diningBorough: diningBorough || undefined,
      diningNeighborhood: diningNeighborhood || undefined,
    };

    if (sessionType === "OFFLINE" || sessionType === "EVENT") {
      body.expectedParticipants = expectedParticipants;
      body.votingDeadline = votingDeadline ? new Date(votingDeadline).toISOString() : undefined;
    }

    // Try browser geolocation as fallback if no dining location (STANDARD only)
    if (sessionType === "STANDARD" && !diningBorough) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve) => {
          if (!navigator.geolocation) {
            resolve(undefined as unknown as GeolocationPosition);
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(undefined as unknown as GeolocationPosition), {
            enableHighAccuracy: false,
            timeout: 3000,
            maximumAge: 60000,
          });
        });
        if (pos && pos.coords) {
          body.lat = pos.coords.latitude;
          body.lng = pos.coords.longitude;
        }
      } catch { /* ignore */ }
    }

    try {
      const session = await ApiClient.sessions.create(body);
      setCreatedSession({ id: session.id, joinCode: session.joinCode });
    } catch (error) {
      console.error("Session creation failed:", error);
      if (error instanceof Error) {
        alert(`Failed to create session: ${error.message}`);
      } else {
        alert("Failed to create session. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sessionTypeCards: { type: SessionType; label: string; desc: string; icon: React.ReactNode }[] = [
    { type: "STANDARD", label: "Standard", desc: "Real-time 2-round voting with timer", icon: <Zap className="w-5 h-5" /> },
    { type: "OFFLINE", label: "Offline", desc: "Async voting with a deadline", icon: <Clock className="w-5 h-5" /> },
    { type: "EVENT", label: "Event", desc: "Host picks restaurants, guests RSVP", icon: <Users className="w-5 h-5" /> },
  ];

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
                <span className="text-xl font-bold text-gray-900">Foodsy</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form Card */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Create a Session
            </h1>
            <p className="text-lg text-gray-600">
              Pick a session type, choose where to eat, and invite friends!
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
                        {copied === "code" ? <Check className="w-4 h-4 text-green-600" /> : <CopyIcon className="w-4 h-4" />}
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
                        {copied === "link" ? <Check className="w-4 h-4 text-green-600" /> : <CopyIcon className="w-4 h-4" />}
                        <span>{copied === "link" ? "Copied" : "Copy"}</span>
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    onClick={() => router.push(`/sessions/${createdSession.id}`)}
                  >
                    {sessionType === "STANDARD" ? "Enter Voting Room" : "View Session"}
                  </Button>
                </div>
              ) : !isAuthenticated ? (
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Sign In Required</h2>
                  <p className="text-gray-600">You need to be signed in to create a session.</p>
                  <Button
                    onClick={() => window.location.href = `https://apifoodsy-backend.com/oauth2/authorization/google`}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-lg flex items-center justify-center transition-colors"
                  >
                    Sign In with Google
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateSession} className="space-y-6">
                  {user && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-medium">
                        Creating session as: {user.displayName || user.username}
                      </p>
                    </div>
                  )}

                  {/* Session Type Selector */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Session Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {sessionTypeCards.map((card) => (
                        <button
                          key={card.type}
                          type="button"
                          onClick={() => setSessionType(card.type)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            sessionType === card.type
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className={`mb-1 ${sessionType === card.type ? "text-orange-600" : "text-gray-400"}`}>
                            {card.icon}
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{card.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{card.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dining Location */}
                  <div className="space-y-4">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-orange-600" />
                      Where are you eating?
                      {(sessionType === "OFFLINE" || sessionType === "EVENT") && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Borough</label>
                      <select
                        value={diningBorough}
                        onChange={(e) => { setDiningBorough(e.target.value); setDiningNeighborhood(""); }}
                        required={sessionType === "OFFLINE" || sessionType === "EVENT"}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-300 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900 bg-white"
                      >
                        <option value="">Select borough</option>
                        {BOROUGHS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Neighborhood</label>
                      <select
                        value={diningNeighborhood}
                        onChange={(e) => setDiningNeighborhood(e.target.value)}
                        disabled={!diningBorough || neighborhoods.length === 0}
                        required={sessionType === "OFFLINE" || sessionType === "EVENT"}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-300 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="">Select neighborhood</option>
                        {neighborhoods.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Offline/Event specific fields */}
                  {(sessionType === "OFFLINE" || sessionType === "EVENT") && (
                    <div className="space-y-4 bg-gray-50 rounded-xl p-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Users className="w-4 h-4 inline mr-1" />
                          How many people are you inviting?
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={20}
                          value={expectedParticipants}
                          onChange={(e) => setExpectedParticipants(Number(e.target.value))}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-300 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Voting deadline
                        </label>
                        <input
                          type="datetime-local"
                          value={votingDeadline}
                          onChange={(e) => setVotingDeadline(e.target.value)}
                          required
                          min={new Date().toISOString().slice(0, 16)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-300 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {submitting ? "Creating..." : "Start Session"}
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

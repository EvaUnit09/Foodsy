"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Check, Copy as CopyIcon, Users, Clock, Zap } from "lucide-react";
import { Button } from "@/components/button";
import { useAuth } from "@/contexts/AuthContext";
import { ApiClient, SessionRequest, NeighborhoodDto } from "@/api/client";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens"];

type SessionType = "STANDARD" | "OFFLINE";

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

  useEffect(() => {
    if (user?.homeBorough) {
      setDiningBorough(user.homeBorough);
      if (user.homeNeighborhood) {
        setDiningNeighborhood(user.homeNeighborhood);
      }
    }
  }, [user]);

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

    if (sessionType === "OFFLINE") {
      body.expectedParticipants = expectedParticipants;
      body.votingDeadline = votingDeadline ? new Date(votingDeadline).toISOString() : undefined;
    }

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
    { type: "STANDARD", label: "Standard", desc: "Real-time 2-round voting with timer", icon: <Zap className="w-4 h-4" /> },
    { type: "OFFLINE", label: "Offline", desc: "Async voting with a deadline", icon: <Clock className="w-4 h-4" /> },
  ];

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
            <h1 className="text-2xl font-semibold text-stone-900">Create a session</h1>
            <p className="text-sm text-stone-500 mt-1.5">
              Pick a type, choose where to eat, and invite friends.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            {createdSession ? (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-stone-900">Session created</h2>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Share with friends</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5">
                      <span className="text-xs text-stone-400 block leading-none mb-0.5">Join Code</span>
                      <span className="text-lg font-bold tracking-widest text-stone-900 font-mono">
                        {createdSession.joinCode}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(createdSession.joinCode, "code")}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-sm font-medium text-stone-700 transition-colors"
                    >
                      {copied === "code" ? <Check className="w-4 h-4 text-emerald-700" /> : <CopyIcon className="w-4 h-4" />}
                      {copied === "code" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <button
                    onClick={() => handleCopy(`${window.location.origin}/sessions/join`, "link")}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-medium text-stone-600 transition-colors"
                  >
                    {copied === "link" ? <Check className="w-4 h-4 text-emerald-700" /> : <CopyIcon className="w-4 h-4" />}
                    {copied === "link" ? "Link copied" : "Copy invite link"}
                  </button>
                </div>

                <Button
                  className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white rounded-xl"
                  onClick={() => router.push(`/sessions/${createdSession.id}`)}
                >
                  {sessionType === "STANDARD" ? "Enter voting room" : "View session"}
                </Button>
              </div>
            ) : !isAuthenticated ? (
              <div className="space-y-5 text-center">
                <h2 className="text-lg font-semibold text-stone-900">Sign in required</h2>
                <p className="text-sm text-stone-500">You need to be signed in to create a session.</p>
                <Button
                  onClick={() => window.location.href = `https://apifoodsy-backend.com/oauth2/authorization/google`}
                  className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white rounded-xl"
                >
                  Sign in with Google
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateSession} className="space-y-5">
                {user && (
                  <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
                    <p className="text-sm text-stone-600">
                      Creating as <span className="font-medium text-stone-900">{user.displayName || user.username}</span>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-700">Session type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {sessionTypeCards.map((card) => (
                      <button
                        key={card.type}
                        type="button"
                        onClick={() => setSessionType(card.type)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                          sessionType === card.type
                            ? "border-stone-900 bg-stone-50"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <div className={`mb-1.5 ${sessionType === card.type ? "text-stone-900" : "text-stone-400"}`}>
                          {card.icon}
                        </div>
                        <p className="text-sm font-semibold text-stone-900">{card.label}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{card.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    Where are you eating?
                    {sessionType === "OFFLINE" && <span className="text-stone-400">*</span>}
                  </label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">Borough</label>
                      <select
                        value={diningBorough}
                        onChange={(e) => { setDiningBorough(e.target.value); setDiningNeighborhood(""); }}
                        required={sessionType === "OFFLINE"}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none text-stone-900 bg-white text-sm"
                      >
                        <option value="">Select borough</option>
                        {BOROUGHS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">Neighborhood</label>
                      <select
                        value={diningNeighborhood}
                        onChange={(e) => setDiningNeighborhood(e.target.value)}
                        disabled={!diningBorough || neighborhoods.length === 0}
                        required={sessionType === "OFFLINE"}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none text-stone-900 bg-white text-sm disabled:bg-stone-50 disabled:text-stone-400"
                      >
                        <option value="">Select neighborhood</option>
                        {neighborhoods.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {sessionType === "OFFLINE" && (
                  <div className="space-y-3 bg-stone-50 rounded-xl p-4 border border-stone-100">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        How many people?
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={expectedParticipants}
                        onChange={(e) => setExpectedParticipants(Number(e.target.value))}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 outline-none text-stone-900 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        Voting deadline
                      </label>
                      <input
                        type="datetime-local"
                        value={votingDeadline}
                        onChange={(e) => setVotingDeadline(e.target.value)}
                        required
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-400 outline-none text-stone-900 bg-white text-sm"
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-40"
                >
                  {submitting ? "Creating…" : "Start session"}
                </Button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-stone-400">
            Once created, you&apos;ll get a code to share with friends.
          </p>
        </div>
      </section>
    </div>
  );
}

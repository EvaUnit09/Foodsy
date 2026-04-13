"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Users, Clock, UserIcon } from "lucide-react";
import { Button } from "@/components/button";
import { useAuth } from "@/contexts/AuthContext";
import { ApiClient, NeighborhoodDto } from "@/api/client";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens"];

export default function CreateEventPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [diningBorough, setDiningBorough] = useState("");
  const [diningNeighborhood, setDiningNeighborhood] = useState("");
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodDto[]>([]);
  const [expectedParticipants, setExpectedParticipants] = useState(4);
  const [votingDeadline, setVotingDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from user's profile location
  useEffect(() => {
    if (user?.homeBorough) {
      setDiningBorough(user.homeBorough);
      if (user.homeNeighborhood) setDiningNeighborhood(user.homeNeighborhood);
    }
  }, [user]);

  // Fetch neighborhoods when borough changes
  useEffect(() => {
    if (diningBorough) {
      ApiClient.neighborhoods
        .getByBorough(diningBorough)
        .then(setNeighborhoods)
        .catch(() => setNeighborhoods([]));
    } else {
      setNeighborhoods([]);
    }
  }, [diningBorough]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && user === null) {
      router.push("/");
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await ApiClient.sessions.create({
        sessionType: "EVENT",
        eventName,
        eventDescription: eventDescription || undefined,
        diningBorough,
        diningNeighborhood,
        expectedParticipants,
        votingDeadline: new Date(votingDeadline).toISOString(),
      });
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 px-4 py-16 text-center text-white">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-white/80 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🍽</span>
        </div>
        <h1 className="text-4xl font-bold mb-2">Plan your group dinner</h1>
        <p className="text-white/80 text-lg max-w-md mx-auto">
          Pick the vibe, choose the restaurants, and let everyone vote on where to eat.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        {!isAuthenticated ? (
          <div className="text-center space-y-4 py-8">
            <p className="text-gray-600">You need to be signed in to create an event.</p>
            <Button
              onClick={() =>
                (window.location.href = `https://apifoodsy-backend.com/oauth2/authorization/google`)
              }
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              Sign In with Google
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event name */}
            <div>
              <input
                type="text"
                placeholder="What's the occasion?"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                className="w-full text-2xl font-semibold px-0 py-2 border-0 border-b-2 border-gray-200 focus:border-orange-500 outline-none placeholder:text-gray-300 text-gray-900 bg-transparent"
              />
            </div>

            {/* Hosted by */}
            {user && (
              <div className="flex items-center space-x-3 py-2">
                <span className="text-sm text-gray-500 font-medium">Hosted by</span>
                <div className="flex items-center space-x-2">
                  {user.effectiveAvatarUrl || user.customAvatarUrl || user.avatarUrl ? (
                    <img
                      src={user.effectiveAvatarUrl || user.customAvatarUrl || user.avatarUrl}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-orange-600" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-900">
                    {user.displayName || user.username}
                  </span>
                </div>
              </div>
            )}

            {/* Eating in */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                Eating in
              </label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={diningBorough}
                  onChange={(e) => {
                    setDiningBorough(e.target.value);
                    setDiningNeighborhood("");
                  }}
                  required
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900 bg-white"
                >
                  <option value="">Borough</option>
                  {BOROUGHS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <select
                  value={diningNeighborhood}
                  onChange={(e) => setDiningNeighborhood(e.target.value)}
                  disabled={!diningBorough || neighborhoods.length === 0}
                  required
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Neighborhood</option>
                  {neighborhoods.map((n) => (
                    <option key={n.id} value={n.name}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expected guests */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <Users className="w-4 h-4 mr-2 text-orange-500" />
                Expected guests
              </label>
              <input
                type="number"
                min={2}
                max={50}
                value={expectedParticipants}
                onChange={(e) => setExpectedParticipants(Number(e.target.value))}
                required
                className="w-28 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900 bg-white text-center text-lg font-semibold"
              />
            </div>

            {/* RSVP deadline */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <Clock className="w-4 h-4 mr-2 text-orange-500" />
                RSVP deadline
              </label>
              <input
                type="datetime-local"
                value={votingDeadline}
                onChange={(e) => setVotingDeadline(e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900 bg-white"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Details <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                placeholder="Add details for your guests..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900 bg-white resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 text-base font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-2xl"
            >
              {submitting ? "Creating event..." : "Create Event"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

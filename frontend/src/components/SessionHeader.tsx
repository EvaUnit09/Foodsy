"use client";

import Link from "next/link";
import { ArrowLeft, Clock, LogIn } from "lucide-react";
import { Button } from "@/components/button";

interface SessionHeaderProps {
  sessionId: number;
  currentRound: number;
  timeLeft: { minutes: number; seconds: number };
  sessionStarted: boolean;
  timerReceived: boolean;
  isHost: boolean;
  startPressed: boolean;
  onStartSession: () => void;
}

export function SessionHeader({
  sessionId,
  currentRound,
  timeLeft,
  sessionStarted,
  timerReceived,
  isHost,
  startPressed,
  onStartSession,
}: SessionHeaderProps) {
  const isTimesUp = timerReceived && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  const isWarning = timerReceived && timeLeft.minutes === 0 && timeLeft.seconds <= 30 && !isTimesUp;

  return (
    <header className="bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: exit + brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs tracking-tight">F</span>
              </div>
              <span className="text-base font-semibold text-stone-900 tracking-tight">Foodsy</span>
            </div>
          </div>

          {/* Center: session + round */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 uppercase tracking-wide">Session</span>
              <span className="text-sm font-mono font-semibold text-stone-900">#{sessionId}</span>
            </div>
            <div className="w-px h-4 bg-stone-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 uppercase tracking-wide">Round</span>
              <span className="text-sm font-semibold text-stone-900">
                {currentRound}/2{currentRound === 2 && " · Final"}
              </span>
            </div>
          </div>

          {/* Right: timer + start */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              isTimesUp ? "bg-red-50" : isWarning ? "bg-amber-50" : "bg-stone-50"
            }`}>
              <Clock className={`w-3.5 h-3.5 ${
                isTimesUp ? "text-red-600" : isWarning ? "text-amber-600" : "text-stone-400"
              }`} />
              {!sessionStarted ? (
                isHost && !startPressed ? (
                  <Button
                    onClick={onStartSession}
                    size="sm"
                    className="bg-stone-900 hover:bg-stone-800 text-white h-6 px-3 text-xs rounded-md"
                  >
                    Start
                  </Button>
                ) : (
                  <span className="text-sm text-stone-400">Waiting</span>
                )
              ) : isTimesUp ? (
                <span className="text-sm font-semibold text-red-600 animate-pulse">Time&apos;s up</span>
              ) : timerReceived ? (
                <span className={`text-sm font-mono font-semibold ${isWarning ? "text-amber-600" : "text-stone-700"}`}>
                  {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                </span>
              ) : (
                <span className="text-sm font-mono text-stone-300">--:--</span>
              )}
            </div>

            <Button variant="ghost" size="sm" className="text-stone-500 hover:text-stone-900 hidden sm:flex">
              <LogIn className="w-4 h-4" />
            </Button>
          </div>

        </div>
      </div>
    </header>
  );
}

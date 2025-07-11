"use client";

import Link from "next/link";
import { ArrowLeft, Clock, User } from "lucide-react";
import { Button } from "@/components/button";

interface SessionHeaderProps {
  sessionId: number;
  currentRound: number;
  timeLeft: { minutes: number; seconds: number };
}

export function SessionHeader({ sessionId, currentRound, timeLeft }: SessionHeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: back link + brand */}
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Exit Session</span>
            </Link>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Foodsy
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                NY
              </span>
            </div>
          </div>

          {/* Right: session info, timer, profile */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Session:</span>
                <span className="text-sm font-mono bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  #{sessionId}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Round:</span>
                <span className={`text-sm font-bold px-2 py-1 rounded ${
                  currentRound === 1 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {currentRound}/2
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-red-600" />
              {timeLeft.minutes === 0 && timeLeft.seconds === 0 ? (
                <span className="text-lg font-bold text-red-600 animate-pulse">
                  TIME&apos;S UP!
                </span>
              ) : (
                <span className="text-lg font-mono text-red-600">
                  {String(timeLeft.minutes).padStart(2, "0")}:
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
              )}
            </div>

            <Button variant="ghost" size="sm">
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
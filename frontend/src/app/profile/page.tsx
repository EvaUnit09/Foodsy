"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, MapPin, UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { ApiClient, NeighborhoodDto } from "@/api/client";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens"];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, checkAuthStatus } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [homeBorough, setHomeBorough] = useState("");
  const [homeNeighborhood, setHomeNeighborhood] = useState("");
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setHomeBorough(user.homeBorough || "");
      setHomeNeighborhood(user.homeNeighborhood || "");
    }
  }, [user]);

  useEffect(() => {
    if (homeBorough) {
      ApiClient.neighborhoods.getByBorough(homeBorough).then(setNeighborhoods).catch(() => setNeighborhoods([]));
    } else {
      setNeighborhoods([]);
    }
  }, [homeBorough]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await ApiClient.auth.profile.update({
        username: username.trim(),
        homeBorough: homeBorough || undefined,
        homeNeighborhood: homeNeighborhood || undefined,
      });
      // When the username changed the backend issues a new access token so the
      // existing JWT (which embeds the old username) doesn't break subsequent calls.
      if (result && "accessToken" in result) {
        localStorage.setItem("accessToken", result.accessToken);
      }
      await checkAuthStatus();
      setMessage({ type: "success", text: "Profile updated" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMessage(null);
    try {
      await ApiClient.auth.profile.uploadAvatar(file);
      await checkAuthStatus();
      setMessage({ type: "success", text: "Avatar updated" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to upload avatar" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRevertAvatar = async () => {
    setMessage(null);
    try {
      await ApiClient.auth.profile.deleteAvatar();
      await checkAuthStatus();
      setMessage({ type: "success", text: "Reverted to Google photo" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to revert avatar" });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#fdf6f0]">
        <AppHeader badge="Profile" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8531a]" />
        </div>
      </div>
    );
  }

  const effectiveAvatar = user.customAvatarUrl || user.avatarUrl;
  const hasCustomAvatar = !!user.customAvatarUrl;

  return (
    <div className="min-h-screen bg-[#fdf6f0]">
      <AppHeader badge="Profile" />

      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-8">Your Profile</h1>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Avatar Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-[rgba(0,0,0,0.06)]">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
                {effectiveAvatar ? (
                  <img src={effectiveAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <UserIcon className="w-10 h-10" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#e8531a] rounded-full flex items-center justify-center text-white hover:bg-[#c94010] transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#1a1a1a]">{user.displayName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {hasCustomAvatar && (
                <button
                  onClick={handleRevertAvatar}
                  className="text-sm text-[#e8531a] hover:underline mt-1"
                >
                  Use Google photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Username Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-[rgba(0,0,0,0.06)]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <UserIcon className="w-4 h-4 inline mr-1" />
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#e8531a] focus:ring-1 focus:ring-[#e8531a] outline-none text-[#1a1a1a]"
            minLength={3}
          />
          {username.length > 0 && username.length < 3 && (
            <p className="text-sm text-red-500 mt-1">Username must be at least 3 characters</p>
          )}
        </div>

        {/* Email Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-[rgba(0,0,0,0.06)]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <p className="text-[#1a1a1a] px-4 py-3 bg-gray-50 rounded-xl">{user.email}</p>
        </div>

        {/* Location Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-[rgba(0,0,0,0.06)]">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <MapPin className="w-4 h-4 inline mr-1" />
            Home Location
          </label>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Borough</label>
              <select
                value={homeBorough}
                onChange={(e) => {
                  setHomeBorough(e.target.value);
                  setHomeNeighborhood("");
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#e8531a] focus:ring-1 focus:ring-[#e8531a] outline-none text-[#1a1a1a] bg-white"
              >
                <option value="">Select borough</option>
                {BOROUGHS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Neighborhood</label>
              <select
                value={homeNeighborhood}
                onChange={(e) => setHomeNeighborhood(e.target.value)}
                disabled={!homeBorough || neighborhoods.length === 0}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#e8531a] focus:ring-1 focus:ring-[#e8531a] outline-none text-[#1a1a1a] bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">Select neighborhood</option>
                {neighborhoods.map((n) => (
                  <option key={n.id} value={n.name}>{n.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || username.length < 3}
          className="w-full py-4 bg-[#e8531a] text-white font-semibold rounded-xl hover:bg-[#c94010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

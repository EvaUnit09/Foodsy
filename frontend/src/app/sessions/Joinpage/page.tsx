"use client";

import React from "react";

import JoinCodeDesign from "@/components/JoinCodeDesign";
export default function SessionPage() {
  return (
    <main className="pt-8 mt-8 max-w-xl mx-auto border-red-400 border-4 rounded-xl shadow-md space-y-6">
      <h1 className={"text-2xl font-bold mb-4 text-center"}>
        Enter Session Details
      </h1>
      <JoinCodeDesign />
    </main>
  );
}

"use client";

import React, { useState } from "react";
import Button from "@mui/material/Button";
import { useRouter } from "next/navigation";

export default function JoinCodeDesign() {
  const [userName, setUserName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Joining session...");
    if (!userName.trim() || !joinCode.trim()) {
      setMessage("Please enter a valid username and join code");
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:8080/api/sessions/sessions/${joinCode}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userName,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("userId", data.userId);
        router.push(`/sessions/${data.sessionId}`);
      } else {
        let errorMsg = "Failed to join session: ";
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          errorMsg = data.message || errorMsg;
        } else {
          const text = await res.text();
          errorMsg = text || errorMsg;
        }
        setMessage(errorMsg);
      }
    } catch (err) {
      setMessage("Failed to join session: " + err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={"space-y-4 max-w-sm mx-auto mb-6"}>
      <input
        className={"border px-3 py-2 w-full rounded text-black"}
        placeholder={"Enter username"}
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <input
        className={"border px-3 py-2 w-full rounded text-black"}
        placeholder={"Join code"}
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value)}
      />
      <Button
        className={"bg-blue-500 text-white px-4 py-2 rounded"}
        type={"submit"}
      >
        Join Session
      </Button>
      {message && <div className={"text-red-500 mt-2"}>{message}</div>}
    </form>
  );
}

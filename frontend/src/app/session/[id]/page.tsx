'use client'

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SessionPage() {
    const { id } = useParams() // session id from url
    const sessionId = id as string

    const [creatorId, setCreatorId] = useState('')

    useEffect(() => {
        console.log('Session ID:', sessionId)
    }, [sessionId]);
    return (
        <main className={"max-w-screen-xl mx-auto p-6 space-y-6"}>
            {/* Session header */}
            <section className={"flex justify-between items-center border-b pb-4"}>
                <div className={"space-y-1"}>
                    <p className={"text-sm text-gray-500"}>Session ID: {sessionId}</p>
                    <p className={"text-sm text-gray-400"}>Creator: {creatorId || 'Loading...'}</p>
                </div>
                {/*Placeholder avatars*/}
                <div className="flex -space-x-3 px-4">
                    {['🧑user1', '👩user2', '🧔user3', '👩‍💼user4'].map((emoji, i) => (
                        <span key={i} className="text-xl px-4 text-gray-300">{emoji}</span>
                    ))}
                </div>
            </section>
            {/* Next : Voting, current restaurant, etc..*/}
            <section>
                <p className={"text-gray-400 italic"}>Voting content coming next</p>
            </section>
        </main>
    )
}
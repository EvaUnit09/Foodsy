'use client'

import { useEffect, useState} from 'react'

type Restaurant = {
    id: number
    providerId: string;
    name: string
    address: string
    category: string
    likeCount: number
    round: number
}

export default function SessionPage() {
    const [sessionId, setSessionId] = useState('5')
    const [restaurants, setRestaurants] = useState<Restaurant[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        console.log('Fetched restaurants:', restaurants)
    }, [restaurants]);

    const fetchRestaurants = async () => {
        if (!sessionId) {
            setRestaurants([]);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`http://localhost:8080/api/sessions/${sessionId}/restaurants`);
            const data = await res.json();
            setRestaurants(data);
        } catch (error) {
            console.error('Error fetching restaurants:', error);
            setRestaurants([]);
        } finally {
            setLoading(false);
        }
    }

    // Only fetch when sessionId changes and is not empty
    useEffect(() => {
        if (sessionId.trim()) {
            fetchRestaurants();
        } else {
            setRestaurants([]); // Clear restaurants when sessionId is empty
        }
    }, [sessionId]);


    return (
        <main className="p-6 max-w-xl mx-auto">
            <h1 className={"text-2xl font-bold mb-4"}>Session {sessionId} Restaurants</h1>

            <input
                className={"border px-3 py-2 mb-4 w-full rounded text-black"}
                placeholder={"Enter session ID"}
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
            />

            {loading ? (
                <p>Loading...</p>
            ) : (
                <ul className={"space-y-4"}>
                    {restaurants.map(r => (
                        <li key={r.id} className={"border rounded-xl p-4 shadow-sm"}>
                            <h2 className={"text-lg font-semibold"}>{r.name}</h2>
                            <p className={"text-sm text-gray-700"}>{r.category}</p>
                            <p className={"text-sm text-gray-500"}>{r.address}</p>
                        </li>
                    ))}
                </ul>
            )}

        </main>
    )
}
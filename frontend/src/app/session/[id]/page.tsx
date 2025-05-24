'use client'

import { useParams } from "next/navigation";
import {useState, useEffect, use} from "react";
import Button from "@mui/material/Button";

export default function SessionPage() {
    const { id } = useParams() // session id from url
    const sessionId = id as string

    const [creatorId, setCreatorId] = useState('guest')
    const [restaurants, setRestaurants] = useState<Restaurant[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [likedRestaurants, setLikedRestaurants] = useState<Restaurant[]>([])
    const [loading, setLoading] = useState(true)
    const [hasVoted, setHasVoted] = useState(false)

    // Calculate voting progress properly
    const totalRestaurants = restaurants.length;
// Sum actual like count values from all restaurants
    const totalLikes = restaurants.reduce((sum, r) => sum + (r.likeCount || 0), 0);
// For percentage, we need to define what 100% means - typically total restaurants
    const likePercentage = totalRestaurants > 0 ? (totalLikes / totalRestaurants) * 100 : 0;

// Debug the values
    useEffect(() => {
        console.log('Total restaurants:', totalRestaurants);
        console.log('Total likes (sum of all like counts):', totalLikes);
        console.log('Like percentage:', likePercentage.toFixed(2) + '%');
    }, [totalLikes, totalRestaurants, likePercentage]);





    type Restaurant = {
        id: number
        providerId: string
        name: string
        category: string
        address: string
        likeCount: number
        round: number
    }

    useEffect(() => {
        console.log('Session ID:', sessionId)
        console.log("useParams() - id:", id)
    }, [sessionId]);

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const res = await fetch(`http://localhost:8080/api/sessions/${sessionId}/restaurants`)
                const data = await res.json();
                setRestaurants(data); // Load the restaurants
                setCurrentIndex(0); // Start at the first restaurant
            } catch (error) {
                console.error('Error fetching restaurants:', error);
            }
        };
        if (sessionId) fetchRestaurants();
    }, [sessionId]);

    const handleVote = async (type: 'like' | 'dislike') => {
        const currentRestaurant = restaurants[currentIndex]; // Get the current restaurant
        if (!currentRestaurant) {
            console.error("No restaurant found or restaurants not loaded properly")
            return;
        }
        // For debugging, log the current restaurant and its like count
        console.log('Voting for restaurant:', currentRestaurant);
        console.log('Current like count:', currentRestaurant.likeCount);


        const votePayload = {
            sessionId: Number(sessionId),
            providerId: String(currentRestaurant.providerId), // providerId is a string
            userId: 'guest', // replace when implementing authentication
            voteType: type
        };
        console.log('Submitting votePayload:', votePayload);

        try {
            const res = await fetch('http://localhost:8080/api/votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify(votePayload),
            });

            if (res.ok) {
                // if its a like, move it to the liked list
                if (type === 'like') {
                    updateRestaurantLikeCount(currentRestaurant);
                    setLikedRestaurants((prev) => [...prev, currentRestaurant]);

                }
                console.log('Vote submitted successfully');
                setHasVoted(true); // prevent further votes

            } else {
                const errorText = await res.text()
                console.error('Failed to submit vote:', errorText);
            }
        } catch (err) {
            console.error('Error submitting vote:', err)
        }

    };

    // Update Local state after a successful vote
    const updateRestaurantLikeCount = (currentRestaurant: Restaurant) => {
        // Always increment by exactly 1, regardless of which restaurant it is
        const updatedRestaurant = {
            ...currentRestaurant,
            likeCount: currentRestaurant.likeCount + 1  // Always increment by 1
        };

        // Update the main restaurants array
        setRestaurants(prev =>
            prev.map(r => r.id === currentRestaurant.id ? updatedRestaurant : r)
        );

        // Update the liked restaurants array
        setLikedRestaurants(prev => {
            const exists = prev.some(r => r.id === currentRestaurant.id);
            if (exists) {
                return prev.map(r => r.id === currentRestaurant.id ? updatedRestaurant : r);
            } else {
                return [...prev, updatedRestaurant];
            }
        });

        console.log('Updated restaurant like count:', updatedRestaurant.name, updatedRestaurant.likeCount);
    };

    const handleNext = () => {
        if (currentIndex < restaurants.length - 1) {
            setCurrentIndex(currentIndex + 1)
            setHasVoted(false) // Reset voting state for next card
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1)
            setHasVoted(false)
        }
    }



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
            {/* Liked restaurant sections*/}
            {/* Progress Status Bar */}
            <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Voting Progress</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(likePercentage, 100)}%` }}  // Cap at 100%
                    ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                    <span>{totalLikes} like{totalLikes !== 1 ? 's' : ''} recorded</span>
                    <span>{Math.min(Math.round(likePercentage), 100)}% complete</span>
                </div>
            </section>
            {/* Liked restaurant sections*/}
            <section>
                <h2 className="text-xl font-bold mb-4">Liked Restaurants</h2>
                <ul className="space-y-4">
                    {likedRestaurants.map((restaurant) => (
                        <li key={restaurant.providerId} className="border rounded-xl p-4 shadow-sm">
                            <h2 className="text-lg font-semibold">{restaurant.name}</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                <span className="font-medium">{restaurant.likeCount || 0}</span> like{restaurant.likeCount !== 1 ? 's' : ''}
                            </p>
                            <div className="relative bg-gray-200 rounded h-4 mt-2">
                                <div
                                    className="bg-green-500 h-4 rounded"
                                    style={{ width: `${Math.min((restaurant.likeCount || 0) * 10, 100)}%` }}
                                ></div>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
            {/* Restaurants*/}
            <section className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold">{restaurants[currentIndex]?.name}</h2>
                    <p className="text-sm text-gray-600">{restaurants[currentIndex]?.category}</p>
                    <p className="text-sm text-gray-400">{restaurants[currentIndex]?.address}</p>
                    <div className="flex justify-between mt-4 px-4">
                        <Button className={"px-4"} onClick={handlePrevious} disabled={currentIndex === 0}>
                            Prev
                        </Button>
                        <div className={"px-4"}>
                            <Button className={"px-4"} onClick={() => handleVote('dislike')} disabled={hasVoted}>
                                Dislike
                            </Button>
                            <Button onClick={() => handleVote('like')} disabled={hasVoted}>
                                Like
                            </Button>
                        </div>
                        <Button onClick={handleNext} disabled={currentIndex === restaurants.length - 1}>
                            Next
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    )
}
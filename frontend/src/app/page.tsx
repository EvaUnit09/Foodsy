'use client'

import { useEffect, useState} from "react";

type Restaurant = {
  id: string
  name: string
  address: string
  category: string
}

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant []>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8080/api/restaurants?near=Toronto&query=sushi')
        .then(res => res.json())
        .then(data => {
          setRestaurants(data)
          setLoading(false)
        })
        .catch(() =>{
          setRestaurants([])
          setLoading(false)
        })
  }, [])

  return (
      <main className="p-4">
          <h1 className="text-2xl font-bold"> Nearby Restaurants</h1>

          {loading ? (
              <p className="text-2xl font-bold">Loading...</p>
          ) : (
              <ul className="mt-4 space-y-3">
                  {restaurants.map(r => (
                      <li key={r.id} className="border rounded-xl p-4 shadow-sm">
                          <h2 className="font-semibold text-amber-50 text-lg">{r.name}</h2>
                          <p className="text-sm text-gray-700">{r.category}</p>
                          <p className="text-sm text-gray-500">{r.address}</p>
                      </li>
                  ))}
              </ul>
          )}
      </main>
  )
}

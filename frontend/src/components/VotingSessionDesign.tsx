import React from "react";
import Button from "@mui/material/Button";
import Image from "next/image";

export default function VotingSessionPage() {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-semibold">foodsy</h1>
        <div className="flex items-center gap-6">
          <nav className="flex gap-4 text-sm">
            <a href="#">Home</a>
            <a href="#">Orders</a>
            <a href="#">Favorites</a>
            <a href="#">Profile</a>
          </nav>
          <Image
            src={`/public/vercel.svg`}
            alt="User avatar"
            width={32}
            height={32}
            className="w-10 h-10 rounded-full"
          />
        </div>
      </div>

      {/* Participants and Timer */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((id) => (
            <Image
              key={id}
              src={`/avatars/${id}.jpg`}
              alt="User"
              width={32}
              height={32}
              className="w-10 h-10 rounded-full"
            />
          ))}
          <span className="ml-4 text-sm text-red-500">Session ID: 12345</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">05</div>
            <div className="text-sm text-gray-500">Minutes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">00</div>
            <div className="text-sm text-gray-500">Seconds</div>
          </div>
        </div>
      </div>

      {/* Top Picks */}
      <h2 className="text-xl font-semibold mb-4">Top Picks</h2>
      <table className="w-full mb-6 text-left border-collapse">
        <thead>
          <tr>
            <th className="border-b py-2">Restaurant</th>
            <th className="border-b py-2">Likes</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: "The Spice Merchant", likes: 15 },
            { name: "Flavors of India", likes: 12 },
            { name: "Curry Corner", likes: 10 },
          ].map((r) => (
            <tr key={r.name}>
              <td className="py-2">{r.name}</td>
              <td className="py-2 text-red-600 font-medium">{r.likes}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Progress bars */}
      <div className="mb-6">
        <div className="font-medium">The Spice Merchant</div>
        <div className="bg-gray-200 h-2 rounded-full mb-2">
          <div className="bg-black h-2 rounded-full w-3/4"></div>
        </div>
        <div className="font-medium">Flavors of India</div>
        <div className="bg-gray-200 h-2 rounded-full mb-2">
          <div className="bg-black h-2 rounded-full w-2/3"></div>
        </div>
        <div className="font-medium">Curry Corner</div>
        <div className="bg-gray-200 h-2 rounded-full mb-2">
          <div className="bg-black h-2 rounded-full w-1/2"></div>
        </div>
      </div>

      {/* Restaurant Card */}
      <Image
        src="/public/vercel.svg"
        width={32}
        height={32}
        alt="Restaurant"
        className="w-full rounded-xl mb-4"
      />
      <h3 className="text-xl font-semibold">The Spice Merchant</h3>
      <p className="text-sm text-gray-500 mb-2">4.5 ⭐⭐⭐⭐ · $$ · Downtown</p>
      <p className="text-gray-600 mb-6">
        Authentic Indian cuisine with a modern twist. Enjoy a variety of
        flavorful dishes in a cozy atmosphere.
      </p>

      {/* Menu Highlights */}
      <h4 className="font-medium mb-2">Menu Highlights</h4>
      <div className="flex gap-4 mb-6">
        {["Chicken Tikka Masala", "Vegetable Biryani", "Garlic Naan"].map(
          (item, index) => (
            <div key={item} className="w-1/3 text-center">
              <Image
                src={`/dishes/${index + 1}.jpg`}
                width={64}
                height={64}
                alt={item}
                className="rounded-lg mb-2"
              />
              <p className="text-sm text-gray-700">{item}</p>
            </div>
          ),
        )}
      </div>

      {/* Review Dropdown */}
      <div className="mb-6">
        <label htmlFor="review" className="block text-sm font-medium mb-1">
          Select a Review
        </label>
        <select id="review" className="w-full border rounded px-3 py-2 text-sm">
          <option>Select a Review</option>
          <option>Great food and ambiance!</option>
          <option>Quick service and tasty biryani.</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex justify-between items-center">
        <Button>Previous</Button>
        <div className="flex gap-4">
          <Button className="bg-red-500 text-white">Like</Button>
          <Button>Dislike</Button>
        </div>
        <Button>Next</Button>
      </div>
    </div>
  );
}

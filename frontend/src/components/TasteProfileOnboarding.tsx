"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";

interface TasteProfileData {
  preferredCuisines: string[];
  priceRange: string;
  preferredBorough: string;
}

interface TasteProfileOnboardingProps {
  onComplete: (profile: TasteProfileData) => void;
  onSkip?: () => void;
}

export function TasteProfileOnboarding({ onComplete, onSkip }: TasteProfileOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<TasteProfileData>({
    preferredCuisines: [],
    priceRange: "",
    preferredBorough: "",
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(profile);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return profile.preferredCuisines.length >= 3;
      case 2:
        return profile.priceRange !== "";
      case 3:
        return profile.preferredBorough !== "";
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Welcome to Foodsy!</span>
          </div>
          <p className="text-gray-600 text-lg">
            Let&apos;s personalize your food experience in just 3 steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {currentStep} of 3</span>
            <span className="text-sm text-gray-500">
              {Math.round((currentStep / 3) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardContent className="p-8">
            {currentStep === 1 && (
              <CuisineSelection
                selectedCuisines={profile.preferredCuisines}
                onChange={(cuisines) =>
                  setProfile({ ...profile, preferredCuisines: cuisines })
                }
              />
            )}
            {currentStep === 2 && (
              <PriceRangeSelection
                selectedRange={profile.priceRange}
                onChange={(range) =>
                  setProfile({ ...profile, priceRange: range })
                }
              />
            )}
            {currentStep === 3 && (
              <BoroughSelection
                selectedBorough={profile.preferredBorough}
                onChange={(borough) =>
                  setProfile({ ...profile, preferredBorough: borough })
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex items-center space-x-4">
            {currentStep > 1 && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            {onSkip && currentStep === 1 && (
              <Button
                onClick={onSkip}
                variant="ghost"
                className="text-gray-500 hover:text-gray-700"
              >
                Skip for now
              </Button>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 min-w-[120px]"
          >
            {currentStep === 3 ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step 1: Cuisine Selection
interface CuisineSelectionProps {
  selectedCuisines: string[];
  onChange: (cuisines: string[]) => void;
}

function CuisineSelection({ selectedCuisines, onChange }: CuisineSelectionProps) {
  const cuisines = [
    { name: "Italian", emoji: "🍝", description: "Pizza, pasta, and more" },
    { name: "Chinese", emoji: "🥡", description: "Dim sum, noodles, stir-fry" },
    { name: "Mexican", emoji: "🌮", description: "Tacos, burritos, quesadillas" },
    { name: "American", emoji: "🍔", description: "Burgers, BBQ, comfort food" },
    { name: "Thai", emoji: "🍜", description: "Pad thai, curry, pho" },
    { name: "Indian", emoji: "🍛", description: "Curry, naan, biryani" },
    { name: "Japanese", emoji: "🍣", description: "Sushi, ramen, teriyaki" },
    { name: "Korean", emoji: "🥘", description: "BBQ, kimchi, bibimbap" },
    { name: "Mediterranean", emoji: "🥙", description: "Hummus, falafel, kebabs" },
    { name: "French", emoji: "🥐", description: "Pastries, wine, cheese" },
    { name: "Vegan", emoji: "🥗", description: "Plant-based options" },
    { name: "Vegetarian", emoji: "🥕", description: "Meat-free dishes" },
  ];

  const handleToggle = (cuisine: string) => {
    if (selectedCuisines.includes(cuisine)) {
      onChange(selectedCuisines.filter((c) => c !== cuisine));
    } else {
      onChange([...selectedCuisines, cuisine]);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What cuisines do you love?
        </h2>
        <p className="text-gray-600">
          Select at least 3 cuisines you enjoy (you can always change this later)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cuisines.map((cuisine) => {
          const isSelected = selectedCuisines.includes(cuisine.name);
          return (
            <button
              key={cuisine.name}
              onClick={() => handleToggle(cuisine.name)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? "border-orange-500 bg-gradient-to-br from-orange-50 to-red-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{cuisine.emoji}</span>
                <div>
                  <div className={`font-semibold ${isSelected ? "text-orange-700" : "text-gray-900"}`}>
                    {cuisine.name}
                  </div>
                  <div className={`text-sm ${isSelected ? "text-orange-600" : "text-gray-500"}`}>
                    {cuisine.description}
                  </div>
                </div>
              </div>
              {isSelected && (
                <div className="mt-2 flex justify-end">
                  <div className="w-5 h-5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedCuisines.length > 0 && (
        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-orange-800 font-medium">
            Selected: {selectedCuisines.join(", ")}
          </p>
          {selectedCuisines.length < 3 && (
            <p className="text-orange-600 text-sm mt-1">
              Please select at least {3 - selectedCuisines.length} more cuisine{3 - selectedCuisines.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Step 2: Price Range Selection
interface PriceRangeSelectionProps {
  selectedRange: string;
  onChange: (range: string) => void;
}

function PriceRangeSelection({ selectedRange, onChange }: PriceRangeSelectionProps) {
  const priceRanges = [
    {
      value: "$",
      label: "Budget-Friendly",
      description: "Under $15 per person",
      example: "Fast food, casual spots",
    },
    {
      value: "$$",
      label: "Mid-Range",
      description: "$15 - $35 per person",
      example: "Nice restaurants, date spots",
    },
    {
      value: "$$$",
      label: "Upscale",
      description: "$35+ per person",
      example: "Fine dining, special occasions",
    },
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What&apos;s your preferred price range?
        </h2>
        <p className="text-gray-600">
          This helps us suggest restaurants that fit your budget
        </p>
      </div>

      <div className="grid gap-4">
        {priceRanges.map((range) => {
          const isSelected = selectedRange === range.value;
          return (
            <button
              key={range.value}
              onClick={() => onChange(range.value)}
              className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? "border-orange-500 bg-gradient-to-br from-orange-50 to-red-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`text-3xl font-bold ${isSelected ? "text-orange-600" : "text-gray-400"}`}>
                    {range.value}
                  </div>
                  <div>
                    <div className={`font-semibold text-lg ${isSelected ? "text-orange-700" : "text-gray-900"}`}>
                      {range.label}
                    </div>
                    <div className={`${isSelected ? "text-orange-600" : "text-gray-500"}`}>
                      {range.description}
                    </div>
                    <div className={`text-sm ${isSelected ? "text-orange-500" : "text-gray-400"}`}>
                      {range.example}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Step 3: Borough Selection
interface BoroughSelectionProps {
  selectedBorough: string;
  onChange: (borough: string) => void;
}

function BoroughSelection({ selectedBorough, onChange }: BoroughSelectionProps) {
  const boroughs = [
    {
      name: "Manhattan",
      description: "The heart of NYC dining",
      highlights: "Fine dining, trendy spots, diverse options",
    },
    {
      name: "Brooklyn",
      description: "Hip neighborhoods and local gems",
      highlights: "Artisanal food, craft cocktails, unique venues",
    },
    {
      name: "Queens",
      description: "Authentic international cuisine",
      highlights: "Authentic ethnic food, hidden gems",
    },
    {
      name: "Bronx",
      description: "Traditional and family-owned spots",
      highlights: "Latin American cuisine, local favorites",
    },
    {
      name: "Staten Island",
      description: "Neighborhood favorites and comfort food",
      highlights: "Italian-American, family restaurants",
    },
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Which NYC borough do you prefer?
        </h2>
        <p className="text-gray-600">
          We&apos;ll prioritize restaurants in your preferred area
        </p>
      </div>

      <div className="grid gap-4">
        {boroughs.map((borough) => {
          const isSelected = selectedBorough === borough.name;
          return (
            <button
              key={borough.name}
              onClick={() => onChange(borough.name)}
              className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? "border-orange-500 bg-gradient-to-br from-orange-50 to-red-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-semibold text-xl ${isSelected ? "text-orange-700" : "text-gray-900"}`}>
                    {borough.name}
                  </div>
                  <div className={`mt-1 ${isSelected ? "text-orange-600" : "text-gray-600"}`}>
                    {borough.description}
                  </div>
                  <div className={`text-sm mt-2 ${isSelected ? "text-orange-500" : "text-gray-500"}`}>
                    {borough.highlights}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
} 
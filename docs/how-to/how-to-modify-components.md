# How to Modify React Components Safely

## Table of Contents
1. [Understanding Components](#understanding-components)
2. [Before You Start](#before-you-start)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Component Patterns](#component-patterns)
5. [Real Examples](#real-examples)
6. [Testing Your Changes](#testing-your-changes)
7. [Common Pitfalls](#common-pitfalls)
8. [Best Practices](#best-practices)
9. [Checklist](#checklist)

## Understanding Components

React components are the **building blocks** of our UI. They encapsulate markup, styling, and behavior into reusable pieces.

### Component Types in Our Codebase:

1. **Page Components** (`app/*/page.tsx`) - Full pages/routes
2. **Feature Components** (`components/`) - Business logic components  
3. **UI Components** (`components/ui/`) - Reusable interface elements

### What Components Do:
- ✅ Render UI elements
- ✅ Handle user interactions
- ✅ Manage local state
- ✅ Call APIs through services
- ✅ Compose other components

### What Components Don't Do:
- ❌ Contain direct database logic
- ❌ Handle routing (except page components)
- ❌ Manage global state (use contexts/hooks instead)
- ❌ Contain complex business rules (use services/hooks)

## Before You Start

### 1. **Understand the Component Structure**

```typescript
// Example: RestaurantCard.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onLike?: (id: string) => void;
  showActions?: boolean;
}

export function RestaurantCard({ restaurant, onLike, showActions = true }: RestaurantCardProps) {
  const [isLiked, setIsLiked] = useState(restaurant.isLiked);
  
  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(restaurant.id);
  };
  
  return (
    <Card>
      <CardContent>
        <h3>{restaurant.name}</h3>
        {showActions && (
          <Button onClick={handleLike}>
            {isLiked ? "♥" : "♡"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2. **Identify Component Dependencies**

Look for:
- **Props**: What data does it receive?
- **State**: What local state does it manage?
- **Hooks**: What custom hooks does it use?
- **Context**: Does it use any React contexts?
- **Child Components**: What other components does it render?
- **External APIs**: Does it make API calls?

### 3. **Find Related Files**

- **Parent Components**: What components use this one?
- **Child Components**: What components does this one use?
- **Types/Interfaces**: What TypeScript types are involved?
- **Styles**: How is it styled? (Tailwind classes, CSS modules)
- **Tests**: Are there existing tests?

## Step-by-Step Guide

### Step 1: Plan Your Changes

**Example Scenario**: Add photo gallery to RestaurantCard

**Current Features**:
- Shows restaurant name and rating
- Like/unlike functionality
- Basic card layout

**New Features to Add**:
- Photo carousel with multiple images
- Click to view full-size photos
- Loading states for photos
- Fallback when no photos available

### Step 2: Create New Types/Interfaces

```typescript
// types/restaurant.ts (add to existing or create new)
interface Restaurant {
  id: string;
  name: string;
  rating: number;
  isLiked: boolean;
  photos: string[]; // ADD THIS
  // ... other existing fields
}

interface PhotoGalleryProps {
  photos: string[];
  restaurantName: string;
  onPhotoClick?: (photoIndex: number) => void;
}
```

### Step 3: Break Down Into Smaller Components

Instead of making one large component, create smaller focused ones:

```typescript
// components/PhotoGallery.tsx - NEW COMPONENT
import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhotoGallery({ photos, restaurantName, onPhotoClick }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">No photos available</span>
      </div>
    );
  }
  
  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };
  
  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };
  
  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden">
      <img
        src={photos[currentIndex]}
        alt={`${restaurantName} - Photo ${currentIndex + 1}`}
        className="w-full h-full object-cover cursor-pointer"
        onClick={() => onPhotoClick?.(currentIndex)}
      />
      
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
            onClick={prevPhoto}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
            onClick={nextPhoto}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {photos.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? "bg-white" : "bg-white/50"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

### Step 4: Modify Existing Component Incrementally

```typescript
// components/RestaurantCard.tsx - MODIFIED
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PhotoGallery } from "@/components/PhotoGallery"; // NEW IMPORT

interface RestaurantCardProps {
  restaurant: Restaurant;
  onLike?: (id: string) => void;
  onPhotoClick?: (restaurantId: string, photoIndex: number) => void; // NEW PROP
  showActions?: boolean;
}

export function RestaurantCard({ 
  restaurant, 
  onLike, 
  onPhotoClick,
  showActions = true 
}: RestaurantCardProps) {
  const [isLiked, setIsLiked] = useState(restaurant.isLiked);
  
  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(restaurant.id);
  };
  
  const handlePhotoClick = (photoIndex: number) => {
    onPhotoClick?.(restaurant.id, photoIndex);
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* NEW: Photo Gallery */}
      <PhotoGallery
        photos={restaurant.photos}
        restaurantName={restaurant.name}
        onPhotoClick={handlePhotoClick}
      />
      
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {restaurant.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{restaurant.rating}</span>
          </div>
          
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`${isLiked ? "text-red-500" : "text-gray-400"} hover:text-red-500`}
            >
              {isLiked ? "♥" : "♡"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 5: Update Parent Components

```typescript
// components/HomepageGrid.tsx - Update to handle new photo functionality
export function HomepageGrid({ data, onRestaurantClick }: HomepageGridProps) {
  const [photoModalData, setPhotoModalData] = useState<{
    restaurantId: string;
    photoIndex: number;
  } | null>(null);
  
  const handlePhotoClick = (restaurantId: string, photoIndex: number) => {
    setPhotoModalData({ restaurantId, photoIndex });
  };
  
  const closePhotoModal = () => {
    setPhotoModalData(null);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
          onLike={handleLike}
          onPhotoClick={handlePhotoClick} // NEW PROP
          onClick={() => onRestaurantClick(restaurant.id)}
        />
      ))}
      
      {/* NEW: Photo Modal */}
      {photoModalData && (
        <PhotoModal
          restaurantId={photoModalData.restaurantId}
          initialPhotoIndex={photoModalData.photoIndex}
          onClose={closePhotoModal}
        />
      )}
    </div>
  );
}
```

## Component Patterns

### 1. **Controlled vs Uncontrolled Components**

**Controlled Component** (recommended for most cases):
```typescript
function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search restaurants..."
    />
  );
}

// Usage
function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  return (
    <SearchInput value={searchTerm} onChange={setSearchTerm} />
  );
}
```

**Uncontrolled Component** (for simple forms):
```typescript
function ContactForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    // Process form data
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" type="text" placeholder="Your name" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### 2. **Compound Components**

```typescript
// Card.tsx - Main component
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {children}
    </div>
  );
}

// CardHeader.tsx - Sub-component
function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      {children}
    </div>
  );
}

// CardContent.tsx - Sub-component
function CardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-4">
      {children}
    </div>
  );
}

// Export as compound component
Card.Header = CardHeader;
Card.Content = CardContent;

export { Card };

// Usage
function RestaurantDetails() {
  return (
    <Card>
      <Card.Header>
        <h2>Restaurant Name</h2>
      </Card.Header>
      <Card.Content>
        <p>Restaurant details...</p>
      </Card.Content>
    </Card>
  );
}
```

### 3. **Render Props Pattern**

```typescript
interface LoadingWrapperProps<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  children: (data: T) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: string) => React.ReactNode;
}

function LoadingWrapper<T>({ 
  data, 
  loading, 
  error, 
  children, 
  loadingComponent, 
  errorComponent 
}: LoadingWrapperProps<T>) {
  if (loading) {
    return loadingComponent || <div>Loading...</div>;
  }
  
  if (error) {
    return errorComponent?.(error) || <div>Error: {error}</div>;
  }
  
  if (!data) {
    return <div>No data available</div>;
  }
  
  return <>{children(data)}</>;
}

// Usage
function RestaurantList() {
  const { data, loading, error } = useRestaurants();
  
  return (
    <LoadingWrapper
      data={data}
      loading={loading}
      error={error}
      loadingComponent={<RestaurantSkeleton />}
      errorComponent={(error) => <ErrorAlert message={error} />}
    >
      {(restaurants) => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {restaurants.map(restaurant => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </LoadingWrapper>
  );
}
```

### 4. **Custom Hooks for Logic**

Extract complex logic into custom hooks:

```typescript
// hooks/useRestaurantLikes.ts
function useRestaurantLikes(restaurantId: string) {
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Load initial like status
  useEffect(() => {
    const loadLikeStatus = async () => {
      try {
        const status = await api.getLikeStatus(restaurantId);
        setIsLiked(status.isLiked);
      } catch (error) {
        console.error("Failed to load like status:", error);
      }
    };
    
    loadLikeStatus();
  }, [restaurantId]);
  
  const toggleLike = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.toggleLike(restaurantId);
      setIsLiked(result.isLiked);
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);
  
  return { isLiked, loading, toggleLike };
}

// Use in component
function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const { isLiked, loading, toggleLike } = useRestaurantLikes(restaurant.id);
  
  return (
    <Card>
      <CardContent>
        <h3>{restaurant.name}</h3>
        <Button onClick={toggleLike} disabled={loading}>
          {loading ? "..." : (isLiked ? "♥" : "♡")}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Real Examples

### Example 1: Adding Filter Functionality to Restaurant List

**Goal**: Add filtering by cuisine, price, and rating

**Before**:
```typescript
function RestaurantList({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {restaurants.map(restaurant => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </div>
  );
}
```

**After**:
```typescript
// types/filters.ts
interface RestaurantFilters {
  cuisine: string[];
  priceLevel: string[];
  minRating: number;
}

// components/RestaurantFilters.tsx - NEW COMPONENT
interface RestaurantFiltersProps {
  filters: RestaurantFilters;
  onFiltersChange: (filters: RestaurantFilters) => void;
  availableCuisines: string[];
  availablePriceLevels: string[];
}

function RestaurantFilters({ filters, onFiltersChange, availableCuisines, availablePriceLevels }: RestaurantFiltersProps) {
  const handleCuisineChange = (cuisine: string, checked: boolean) => {
    const newCuisines = checked
      ? [...filters.cuisine, cuisine]
      : filters.cuisine.filter(c => c !== cuisine);
    
    onFiltersChange({ ...filters, cuisine: newCuisines });
  };
  
  const handlePriceChange = (priceLevel: string, checked: boolean) => {
    const newPriceLevels = checked
      ? [...filters.priceLevel, priceLevel]
      : filters.priceLevel.filter(p => p !== priceLevel);
    
    onFiltersChange({ ...filters, priceLevel: newPriceLevels });
  };
  
  const handleRatingChange = (rating: number) => {
    onFiltersChange({ ...filters, minRating: rating });
  };
  
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Filters</h3>
      
      {/* Cuisine Filter */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Cuisine</h4>
        {availableCuisines.map(cuisine => (
          <label key={cuisine} className="flex items-center space-x-2 mb-1">
            <input
              type="checkbox"
              checked={filters.cuisine.includes(cuisine)}
              onChange={(e) => handleCuisineChange(cuisine, e.target.checked)}
            />
            <span>{cuisine}</span>
          </label>
        ))}
      </div>
      
      {/* Price Filter */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Price</h4>
        {availablePriceLevels.map(price => (
          <label key={price} className="flex items-center space-x-2 mb-1">
            <input
              type="checkbox"
              checked={filters.priceLevel.includes(price)}
              onChange={(e) => handlePriceChange(price, e.target.checked)}
            />
            <span>{price}</span>
          </label>
        ))}
      </div>
      
      {/* Rating Filter */}
      <div>
        <h4 className="font-medium mb-2">Minimum Rating</h4>
        <input
          type="range"
          min="1"
          max="5"
          step="0.5"
          value={filters.minRating}
          onChange={(e) => handleRatingChange(Number(e.target.value))}
          className="w-full"
        />
        <span>{filters.minRating}+ stars</span>
      </div>
    </Card>
  );
}

// hooks/useRestaurantFilters.ts - NEW HOOK
function useRestaurantFilters(restaurants: Restaurant[]) {
  const [filters, setFilters] = useState<RestaurantFilters>({
    cuisine: [],
    priceLevel: [],
    minRating: 1
  });
  
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => {
      // Cuisine filter
      if (filters.cuisine.length > 0 && !filters.cuisine.includes(restaurant.cuisine)) {
        return false;
      }
      
      // Price filter
      if (filters.priceLevel.length > 0 && !filters.priceLevel.includes(restaurant.priceLevel)) {
        return false;
      }
      
      // Rating filter
      if (restaurant.rating < filters.minRating) {
        return false;
      }
      
      return true;
    });
  }, [restaurants, filters]);
  
  const availableCuisines = useMemo(() => {
    return [...new Set(restaurants.map(r => r.cuisine))].sort();
  }, [restaurants]);
  
  const availablePriceLevels = useMemo(() => {
    return [...new Set(restaurants.map(r => r.priceLevel))].sort();
  }, [restaurants]);
  
  return {
    filters,
    setFilters,
    filteredRestaurants,
    availableCuisines,
    availablePriceLevels
  };
}

// components/RestaurantList.tsx - MODIFIED
function RestaurantList({ restaurants }: { restaurants: Restaurant[] }) {
  const {
    filters,
    setFilters,
    filteredRestaurants,
    availableCuisines,
    availablePriceLevels
  } = useRestaurantFilters(restaurants);
  
  return (
    <div className="flex gap-6">
      {/* Filters Sidebar */}
      <div className="w-64 flex-shrink-0">
        <RestaurantFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableCuisines={availableCuisines}
          availablePriceLevels={availablePriceLevels}
        />
      </div>
      
      {/* Restaurant Grid */}
      <div className="flex-1">
        <div className="mb-4">
          <span className="text-gray-600">
            Showing {filteredRestaurants.length} of {restaurants.length} restaurants
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRestaurants.map(restaurant => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
        
        {filteredRestaurants.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No restaurants match your filters.</p>
            <Button onClick={() => setFilters({ cuisine: [], priceLevel: [], minRating: 1 })}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Example 2: Adding Real-time Updates to Voting Components

**Goal**: Show live vote counts and participant updates

```typescript
// hooks/useSessionUpdates.ts - NEW HOOK
function useSessionUpdates(sessionId: number) {
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const { connected, subscribe, send } = useWebSocket();
  
  useEffect(() => {
    if (!connected) return;
    
    // Subscribe to session updates
    subscribe(`/topic/session/${sessionId}`, (message) => {
      const update = JSON.parse(message.body);
      
      switch (update.type) {
        case 'PARTICIPANT_JOINED':
          setParticipants(prev => [...prev, update.participant]);
          break;
        case 'PARTICIPANT_LEFT':
          setParticipants(prev => prev.filter(p => p.id !== update.participantId));
          break;
        case 'VOTE_CAST':
          setVotes(prev => [...prev, update.vote]);
          break;
        case 'SESSION_UPDATED':
          setSession(update.session);
          break;
      }
    });
    
    // Request initial data
    send(`/app/session/${sessionId}/join`, {});
    
  }, [connected, sessionId, subscribe, send]);
  
  return { session, participants, votes };
}

// components/SessionStatus.tsx - NEW COMPONENT
function SessionStatus({ sessionId }: { sessionId: number }) {
  const { session, participants, votes } = useSessionUpdates(sessionId);
  
  if (!session) {
    return <div>Loading session...</div>;
  }
  
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">{session.name}</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Status:</span>
          <Badge variant={session.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {session.status}
          </Badge>
        </div>
        
        <div className="flex justify-between">
          <span>Participants:</span>
          <span>{participants.length}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Total Votes:</span>
          <span>{votes.length}</span>
        </div>
        
        {session.status === 'ACTIVE' && (
          <div className="flex justify-between">
            <span>Time Remaining:</span>
            <Timer endTime={session.roundEndTime} />
          </div>
        )}
      </div>
    </Card>
  );
}

// components/VotingInterface.tsx - MODIFIED to use real-time updates
function VotingInterface({ sessionId }: { sessionId: number }) {
  const { session, participants, votes } = useSessionUpdates(sessionId);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  
  // Calculate vote counts in real-time
  const voteCountsByRestaurant = useMemo(() => {
    return votes.reduce((counts, vote) => {
      counts[vote.restaurantId] = (counts[vote.restaurantId] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }, [votes]);
  
  const handleVote = async (restaurantId: string) => {
    try {
      await voteApi.submitVote({ sessionId, restaurantId, voteType: 'LIKE' });
      // Vote will be updated via WebSocket
    } catch (error) {
      console.error("Failed to submit vote:", error);
    }
  };
  
  return (
    <div className="space-y-6">
      <SessionStatus sessionId={sessionId} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map(restaurant => (
          <VotingRestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            voteCount={voteCountsByRestaurant[restaurant.id] || 0}
            onVote={handleVote}
            disabled={session?.status !== 'ACTIVE'}
          />
        ))}
      </div>
      
      <ParticipantsList participants={participants} />
    </div>
  );
}
```

## Testing Your Changes

### 1. **Component Unit Tests**

```typescript
// __tests__/RestaurantCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RestaurantCard } from '@/components/RestaurantCard';

const mockRestaurant = {
  id: '1',
  name: 'Test Restaurant',
  rating: 4.5,
  isLiked: false,
  photos: ['photo1.jpg', 'photo2.jpg']
};

describe('RestaurantCard', () => {
  test('renders restaurant name and rating', () => {
    render(<RestaurantCard restaurant={mockRestaurant} />);
    
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });
  
  test('calls onLike when like button is clicked', () => {
    const mockOnLike = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onLike={mockOnLike} />);
    
    const likeButton = screen.getByRole('button');
    fireEvent.click(likeButton);
    
    expect(mockOnLike).toHaveBeenCalledWith('1');
  });
  
  test('shows photo gallery when photos are provided', () => {
    render(<RestaurantCard restaurant={mockRestaurant} />);
    
    const image = screen.getByAltText('Test Restaurant - Photo 1');
    expect(image).toBeInTheDocument();
  });
  
  test('hides actions when showActions is false', () => {
    render(<RestaurantCard restaurant={mockRestaurant} showActions={false} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
```

### 2. **Integration Tests**

```typescript
// __tests__/RestaurantList.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RestaurantList } from '@/components/RestaurantList';
import * as api from '@/api/restaurantApi';

jest.mock('@/api/restaurantApi');
const mockApi = api as jest.Mocked<typeof api>;

const mockRestaurants = [
  { id: '1', name: 'Italian Place', cuisine: 'Italian', priceLevel: '$$', rating: 4.5 },
  { id: '2', name: 'Sushi Bar', cuisine: 'Japanese', priceLevel: '$$$', rating: 4.8 },
];

describe('RestaurantList Integration', () => {
  beforeEach(() => {
    mockApi.getRestaurants.mockResolvedValue(mockRestaurants);
  });
  
  test('filters restaurants by cuisine', async () => {
    render(<RestaurantList />);
    
    // Wait for restaurants to load
    await waitFor(() => {
      expect(screen.getByText('Italian Place')).toBeInTheDocument();
      expect(screen.getByText('Sushi Bar')).toBeInTheDocument();
    });
    
    // Filter by Italian cuisine
    const italianCheckbox = screen.getByLabelText('Italian');
    fireEvent.click(italianCheckbox);
    
    // Only Italian restaurant should be visible
    expect(screen.getByText('Italian Place')).toBeInTheDocument();
    expect(screen.queryByText('Sushi Bar')).not.toBeInTheDocument();
  });
});
```

### 3. **Visual Testing**

```typescript
// __tests__/RestaurantCard.visual.test.tsx
import { render } from '@testing-library/react';
import { RestaurantCard } from '@/components/RestaurantCard';

describe('RestaurantCard Visual Tests', () => {
  test('renders correctly with all props', () => {
    const component = render(
      <RestaurantCard
        restaurant={mockRestaurant}
        onLike={jest.fn()}
        showActions={true}
      />
    );
    
    expect(component.container.firstChild).toMatchSnapshot();
  });
  
  test('renders correctly without actions', () => {
    const component = render(
      <RestaurantCard restaurant={mockRestaurant} showActions={false} />
    );
    
    expect(component.container.firstChild).toMatchSnapshot();
  });
});
```

## Common Pitfalls

### 1. **Mutating Props Directly**

❌ **DON'T**: Modify props directly
```typescript
function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const handleLike = () => {
    restaurant.isLiked = !restaurant.isLiked; // WRONG - mutating props
  };
  
  return <button onClick={handleLike}>Like</button>;
}
```

✅ **DO**: Use local state or call parent handlers
```typescript
function RestaurantCard({ restaurant, onLike }: RestaurantCardProps) {
  const [isLiked, setIsLiked] = useState(restaurant.isLiked);
  
  const handleLike = () => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    onLike?.(restaurant.id, newLikedState);
  };
  
  return <button onClick={handleLike}>Like</button>;
}
```

### 2. **Missing Key Props in Lists**

❌ **DON'T**: Forget keys or use array indices
```typescript
function RestaurantList({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <div>
      {restaurants.map((restaurant, index) => (
        <RestaurantCard key={index} restaurant={restaurant} /> // WRONG
      ))}
    </div>
  );
}
```

✅ **DO**: Use stable, unique identifiers
```typescript
function RestaurantList({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <div>
      {restaurants.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} /> // CORRECT
      ))}
    </div>
  );
}
```

### 3. **Memory Leaks with Event Listeners**

❌ **DON'T**: Forget to clean up event listeners
```typescript
function WindowSizeTracker() {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    // MISSING: No cleanup!
  }, []);
  
  return <div>{windowSize.width} x {windowSize.height}</div>;
}
```

✅ **DO**: Always clean up in useEffect
```typescript
function WindowSizeTracker() {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize); // CLEANUP
    };
  }, []);
  
  return <div>{windowSize.width} x {windowSize.height}</div>;
}
```

### 4. **Stale Closures in useCallback/useMemo**

❌ **DON'T**: Forget dependencies
```typescript
function SearchComponent({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  
  const searchRestaurants = useCallback(async () => {
    const data = await api.search(query);
    setResults(data);
  }, []); // WRONG - missing 'query' dependency
  
  return <input onChange={(e) => setQuery(e.target.value)} />;
}
```

✅ **DO**: Include all dependencies
```typescript
function SearchComponent({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  
  const searchRestaurants = useCallback(async () => {
    const data = await api.search(query);
    setResults(data);
  }, [query]); // CORRECT - includes 'query'
  
  return <input onChange={(e) => setQuery(e.target.value)} />;
}
```

## Best Practices

### 1. **Component Composition Over Inheritance**

✅ **Good**: Compose smaller components
```typescript
function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Card>
      <PhotoGallery photos={restaurant.photos} />
      <CardContent>
        <RestaurantInfo restaurant={restaurant} />
        <RestaurantActions restaurant={restaurant} />
      </CardContent>
    </Card>
  );
}
```

### 2. **Use TypeScript Interfaces**

```typescript
interface RestaurantCardProps {
  restaurant: Restaurant;
  onLike?: (id: string, liked: boolean) => void;
  onPhotoClick?: (id: string, photoIndex: number) => void;
  showActions?: boolean;
  className?: string;
}
```

### 3. **Handle Loading and Error States**

```typescript
function RestaurantList() {
  const { data, loading, error } = useRestaurants();
  
  if (loading) return <RestaurantSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState />;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data.map(restaurant => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </div>
  );
}
```

### 4. **Optimize Performance**

```typescript
// Memoize expensive calculations
const filteredRestaurants = useMemo(() => {
  return restaurants.filter(r => r.rating >= minRating);
}, [restaurants, minRating]);

// Memoize child components that don't need to re-render
const MemoizedRestaurantCard = React.memo(RestaurantCard);

// Use useCallback for event handlers passed to children
const handleLike = useCallback((id: string) => {
  // Handle like logic
}, []);
```

## Checklist

Before committing your component changes:

### ✅ **Code Quality**
- [ ] TypeScript interfaces are defined for all props
- [ ] Component has a single, clear responsibility
- [ ] No direct prop mutations
- [ ] Proper key props for list items

### ✅ **State Management**
- [ ] Local state is used appropriately
- [ ] useEffect dependencies are correct
- [ ] No memory leaks from event listeners
- [ ] Cleanup functions are provided where needed

### ✅ **Performance**
- [ ] useMemo used for expensive calculations
- [ ] useCallback used for event handlers
- [ ] React.memo used for pure components
- [ ] No unnecessary re-renders

### ✅ **Accessibility**
- [ ] Proper ARIA labels and roles
- [ ] Keyboard navigation works
- [ ] Focus management is correct
- [ ] Screen reader friendly

### ✅ **Testing**
- [ ] Unit tests cover component behavior
- [ ] Integration tests verify component interactions
- [ ] Visual tests or snapshots for UI changes
- [ ] Error states are tested

### ✅ **User Experience**
- [ ] Loading states are shown
- [ ] Error states are handled gracefully
- [ ] Empty states are informative
- [ ] Responsive design works on all devices

---

## Need Help?

If you're unsure about component changes:

1. **Check similar components**: Look for patterns in the existing codebase
2. **Break it down**: Split complex components into smaller pieces
3. **Test early**: Write tests as you develop, not after
4. **Ask for review**: Get feedback on component design and API

Remember: Good components are predictable, testable, and reusable! 🚀 
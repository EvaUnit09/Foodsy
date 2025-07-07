# Frontend Architecture Overview

## Table of Contents
1. [Project Structure](#project-structure)
2. [Architecture Patterns](#architecture-patterns)
3. [Key Technologies](#key-technologies)
4. [Component Organization](#component-organization)
5. [State Management](#state-management)
6. [Routing](#routing)
7. [API Integration](#api-integration)
8. [Styling](#styling)
9. [Authentication](#authentication)
10. [Best Practices](#best-practices)

## Project Structure

The FoodieFriends frontend follows Next.js 13+ App Router structure:

```
frontend/
├── src/
│   ├── api/                              # API integration layer
│   │   ├── homepageApi.ts                # Homepage data fetching
│   │   └── voteApi.ts                    # Voting functionality
│   ├── app/                              # Next.js App Router pages
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Homepage
│   │   ├── globals.css                   # Global styles
│   │   ├── auth/                         # Authentication pages
│   │   │   ├── signin/page.tsx           # Sign in page
│   │   │   ├── signup/page.tsx           # Sign up page
│   │   │   └── oauth2/success/page.tsx   # OAuth2 callback
│   │   └── sessions/                     # Voting session pages
│   │       ├── [id]/page.tsx             # Dynamic session page
│   │       ├── create/page.tsx           # Create session
│   │       └── vote/page.tsx             # Voting interface
│   ├── components/                       # Reusable UI components
│   │   ├── ui/                           # Base UI components
│   │   │   ├── button.tsx                # Button component
│   │   │   ├── card.tsx                  # Card component
│   │   │   ├── input.tsx                 # Input component
│   │   │   └── ...                       # Other UI components
│   │   ├── Homepage.tsx                  # Homepage layout
│   │   ├── HomepageGrid.tsx              # Restaurant grid display
│   │   ├── TasteProfileOnboarding.tsx    # User onboarding
│   │   ├── VotingSessionDesign.tsx       # Voting interface
│   │   └── ...                           # Feature components
│   ├── contexts/                         # React Context providers
│   │   └── AuthContext.tsx               # Authentication state
│   ├── hooks/                            # Custom React hooks
│   │   ├── useSessionVoting.ts           # Voting logic
│   │   └── useWebSockethook.tsx          # WebSocket management
│   └── lib/                              # Utility functions
│       └── utils.ts                      # Helper utilities
├── public/                               # Static assets
│   ├── next.svg                          # Next.js logo
│   └── ...                               # Other static files
├── tailwind.config.ts                    # Tailwind CSS configuration
├── next.config.ts                        # Next.js configuration
└── package.json                          # Dependencies and scripts
```

## Architecture Patterns

### 1. **Component-Based Architecture**
React components are organized by feature and complexity:

```
[Page Components] → [Feature Components] → [UI Components]
       ↕                    ↕                   ↕
   [API Calls]         [Business Logic]    [Pure UI]
```

### 2. **Custom Hooks Pattern**
Complex logic is extracted into reusable hooks:

```typescript
// Custom hook for voting logic
export const useSessionVoting = (sessionId: number) => {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const submitVote = useCallback(async (restaurantId: string) => {
    // Voting logic here
  }, [sessionId]);
  
  return { votes, loading, submitVote };
};
```

### 3. **Context Provider Pattern**
Global state managed through React Context:

```typescript
// Authentication context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  return (
    <AuthContext.Provider value={{ user, isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Key Technologies

### Next.js 13+ (App Router)
- **File-based routing**: Pages defined by file structure
- **Server and Client Components**: Optimized rendering
- **Built-in optimization**: Image optimization, font loading
- **TypeScript support**: Full type safety

### React 18
- **Hooks**: useState, useEffect, useCallback, useMemo
- **Context API**: Global state management
- **Suspense**: Loading states and error boundaries
- **Concurrent Features**: Better user experience

### TypeScript
- **Type Safety**: Catch errors at compile time
- **Interface Definitions**: Clear API contracts
- **IntelliSense**: Better development experience
- **Refactoring Support**: Safe code changes

### Tailwind CSS
- **Utility-First**: Rapid UI development
- **Responsive Design**: Mobile-first approach
- **Design System**: Consistent styling
- **Custom Configuration**: Brand colors and spacing

## Component Organization

### Page Components (`app/*/page.tsx`)
- **Purpose**: Represent entire pages/routes
- **Responsibilities**:
  - Handle routing and URL parameters
  - Manage page-level state
  - Orchestrate feature components
  - Handle authentication guards

**Example**: `app/sessions/[id]/page.tsx`
```typescript
export default function SessionPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  
  // Page-level state and logic
  const [session, setSession] = useState(null);
  const { user } = useAuth();
  
  return (
    <div>
      <SessionHeader sessionId={sessionId} />
      <VotingInterface sessionId={sessionId} />
    </div>
  );
}
```

### Feature Components (`components/`)
- **Purpose**: Implement specific features
- **Responsibilities**:
  - Handle feature-specific logic
  - Manage local state
  - Call APIs
  - Compose UI components

**Example**: `TasteProfileOnboarding.tsx`
```typescript
export function TasteProfileOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({});
  
  const handleSubmit = async () => {
    await saveTasteProfile(preferences);
    onComplete();
  };
  
  return (
    <Card>
      {step === 1 && <CuisineSelection />}
      {step === 2 && <PriceSelection />}
      {step === 3 && <BoroughSelection />}
    </Card>
  );
}
```

### UI Components (`components/ui/`)
- **Purpose**: Reusable interface elements
- **Responsibilities**:
  - Pure presentation
  - Accept props for customization
  - No business logic
  - Consistent styling

**Example**: `button.tsx`
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({ variant = "default", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

## State Management

### 1. **Local Component State** (`useState`)
For component-specific data:

```typescript
function RestaurantCard({ restaurant }: Props) {
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  
  return (
    <Card>
      <Button 
        onClick={() => setIsLiked(!isLiked)}
        disabled={loading}
      >
        {isLiked ? "♥" : "♡"}
      </Button>
    </Card>
  );
}
```

### 2. **React Context** (Global State)
For shared state across components:

```typescript
// AuthContext.tsx
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Using in components
function Header() {
  const { user, signOut } = useAuth();
  
  return (
    <header>
      {user ? (
        <Button onClick={signOut}>Sign Out</Button>
      ) : (
        <Link href="/auth/signin">Sign In</Link>
      )}
    </header>
  );
}
```

### 3. **Custom Hooks** (Complex Logic)
For reusable stateful logic:

```typescript
// useSessionVoting.ts
export function useSessionVoting(sessionId: number) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [quotaRemaining, setQuotaRemaining] = useState(0);
  
  const submitVote = useCallback(async (request: VoteRequest) => {
    try {
      await voteApi.submitVote(request);
      // Update local state optimistically
      setVotes(prev => [...prev, { ...request, timestamp: new Date() }]);
      setQuotaRemaining(prev => prev - 1);
    } catch (error) {
      console.error("Vote submission failed:", error);
    }
  }, []);
  
  return { votes, quotaRemaining, submitVote };
}
```

## Routing

### App Router Structure
Next.js 13+ uses file-based routing in the `app/` directory:

```
app/
├── page.tsx                    # Homepage (/)
├── layout.tsx                  # Root layout
├── auth/
│   ├── signin/page.tsx         # /auth/signin
│   └── signup/page.tsx         # /auth/signup
├── sessions/
│   ├── create/page.tsx         # /sessions/create
│   ├── [id]/page.tsx           # /sessions/:id (dynamic)
│   └── vote/page.tsx           # /sessions/vote
└── test/page.tsx               # /test
```

### Dynamic Routes
```typescript
// app/sessions/[id]/page.tsx
export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id; // Gets the ID from URL
  
  return <div>Session {sessionId}</div>;
}
```

### Navigation
```typescript
import { useRouter } from "next/navigation";
import Link from "next/link";

function Navigation() {
  const router = useRouter();
  
  return (
    <nav>
      {/* Declarative navigation */}
      <Link href="/sessions/create">Create Session</Link>
      
      {/* Programmatic navigation */}
      <Button onClick={() => router.push("/auth/signin")}>
        Sign In
      </Button>
    </nav>
  );
}
```

## API Integration

### API Layer (`src/api/`)
Centralized API functions with TypeScript interfaces:

```typescript
// homepageApi.ts
export interface RestaurantSummaryDto {
  id: string;
  name: string;
  category: string;
  rating: number;
  priceLevel: string;
  photos: string[];
}

export interface HomepageResponseDto {
  yourPicks: RestaurantSummaryDto[];
  highlights: RestaurantSummaryDto[];
  trending: RestaurantSummaryDto[];
  spotlight: RestaurantSummaryDto[];
  hasOnboarded: boolean;
}

export function useHomepageApi() {
  const getHomepageData = async (authenticated: boolean): Promise<HomepageResponseDto> => {
    const response = await fetch(`${API_BASE_URL}/homepage`, {
      method: "GET",
      credentials: "include", // Include auth cookies
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  };
  
  return { getHomepageData };
}
```

### Error Handling
```typescript
function Homepage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await homepageApi.getHomepageData(true);
        setData(result);
      } catch (err) {
        setError(err.message);
        console.error("Failed to load homepage:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return <EmptyState />;
  
  return <HomepageGrid data={data} />;
}
```

## Styling

### Tailwind CSS Usage
Utility-first CSS framework with component-specific styling:

```typescript
function RestaurantCard({ restaurant }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <img 
        src={restaurant.image} 
        alt={restaurant.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {restaurant.name}
        </h3>
        <div className="flex items-center space-x-2">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium">{restaurant.rating}</span>
        </div>
      </div>
    </div>
  );
}
```

### Responsive Design
```typescript
function HomepageGrid({ data }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {data.restaurants.map(restaurant => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </div>
  );
}
```

### Component Variants (CVA)
```typescript
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-orange-500 text-white hover:bg-orange-600",
        outline: "border border-orange-500 text-orange-500 hover:bg-orange-50",
        ghost: "text-orange-500 hover:bg-orange-50",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
```

## Authentication

### Auth Context Pattern
```typescript
// AuthContext.tsx
interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  loading: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check for existing authentication on mount
    checkAuthStatus();
  }, []);
  
  const signIn = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };
  
  const signOut = () => {
    setUser(null);
    setIsAuthenticated(false);
  };
  
  return (
    <AuthContext.Provider value={{ user, isAuthenticated, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Protected Routes
```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/signin");
    }
  }, [isAuthenticated, loading, router]);
  
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return null;
  
  return <>{children}</>;
}
```

## Best Practices for Junior Engineers

### 1. **Component Naming and Organization**
```typescript
// ✅ DO: Use PascalCase for components
export function RestaurantCard({ restaurant }: Props) {
  return <div>...</div>;
}

// ✅ DO: Group related components
components/
├── RestaurantCard.tsx
├── RestaurantList.tsx
├── RestaurantFilter.tsx
└── index.ts  // Re-export components

// ❌ DON'T: Use lowercase or unclear names
export function card() { ... }  // BAD
export function Component1() { ... }  // BAD
```

### 2. **Props and TypeScript**
```typescript
// ✅ DO: Define clear interfaces
interface RestaurantCardProps {
  restaurant: Restaurant;
  onLike?: (id: string) => void;
  showActions?: boolean;
}

export function RestaurantCard({ restaurant, onLike, showActions = true }: RestaurantCardProps) {
  return (
    <div>
      <h3>{restaurant.name}</h3>
      {showActions && onLike && (
        <Button onClick={() => onLike(restaurant.id)}>Like</Button>
      )}
    </div>
  );
}

// ❌ DON'T: Use any or unclear prop types
function RestaurantCard(props: any) { ... }  // BAD
```

### 3. **State Management**
```typescript
// ✅ DO: Use local state for component-specific data
function RestaurantCard({ restaurant }: Props) {
  const [isLiked, setIsLiked] = useState(restaurant.isLiked);
  const [loading, setLoading] = useState(false);
  
  const handleLike = async () => {
    setLoading(true);
    try {
      await toggleLike(restaurant.id);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return <Button onClick={handleLike} disabled={loading}>...</Button>;
}

// ✅ DO: Use context for global state
function Header() {
  const { user, signOut } = useAuth();  // Global auth state
  return <div>Welcome, {user?.username}</div>;
}

// ❌ DON'T: Pass state through many levels (prop drilling)
<Page user={user}>
  <Header user={user}>
    <UserMenu user={user}>
      <UserProfile user={user} />  // BAD - pass through 4 levels
    </UserMenu>
  </Header>
</Page>
```

### 4. **Custom Hooks**
```typescript
// ✅ DO: Extract complex logic into custom hooks
function useRestaurantLikes(restaurantId: string) {
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  
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
function RestaurantCard({ restaurant }: Props) {
  const { isLiked, loading, toggleLike } = useRestaurantLikes(restaurant.id);
  
  return (
    <Button onClick={toggleLike} disabled={loading}>
      {isLiked ? "♥" : "♡"}
    </Button>
  );
}
```

### 5. **Error Handling**
```typescript
// ✅ DO: Handle errors gracefully with user feedback
function Homepage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const result = await api.getHomepageData();
        setData(result);
      } catch (err) {
        setError("Failed to load restaurants. Please try again.");
        console.error("Homepage load error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  
  return <RestaurantGrid data={data} />;
}
```

### 6. **Performance Optimization**
```typescript
// ✅ DO: Use useCallback for event handlers
function RestaurantList({ restaurants }: Props) {
  const [filter, setFilter] = useState("");
  
  const handleFilterChange = useCallback((value: string) => {
    setFilter(value);
  }, []);
  
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => 
      r.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [restaurants, filter]);
  
  return (
    <div>
      <Input 
        value={filter} 
        onChange={(e) => handleFilterChange(e.target.value)} 
        placeholder="Search restaurants..."
      />
      {filteredRestaurants.map(restaurant => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </div>
  );
}
```

## Next Steps

After understanding this overview, refer to these specific guides:
- [How to Modify React Components](./how-to-modify-components.md)
- [How to Add New Pages](./how-to-add-pages.md)
- [State Management Guide](./state-management-guide.md)
- [API Integration Guide](./api-integration-guide.md)
- [Authentication Flow Guide](./authentication-flow-guide.md) 
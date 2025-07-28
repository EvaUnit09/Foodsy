/**
 * Design Token System for Foodsy
 * Centralizes CSS class combinations to eliminate Tailwind duplication
 */

export const designTokens = {
  // Color gradients
  gradients: {
    primary: "bg-gradient-to-r from-orange-500 to-red-500",
    primaryHover: "hover:from-orange-600 hover:to-red-600",
    primaryText: "text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500",
    background: "bg-gradient-to-br from-orange-50 to-red-50",
    cardBackground: "bg-gradient-to-br from-orange-50 to-red-50",
  },

  // Cards and containers
  cards: {
    elevated: "shadow-xl border-2 border-orange-600 rounded-2xl",
    standard: "shadow-lg rounded-lg border border-gray-200",
    hover: "hover:shadow-xl transition-all duration-300",
    interactive: "cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden",
    auth: "bg-white rounded-2xl shadow-xl p-6",
    content: "rounded-2xl shadow-xl p-6 max-w-2xl mx-auto",
  },

  // Buttons
  buttons: {
    primary: "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600",
    secondary: "border-orange-200 text-orange-600 hover:bg-orange-50",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    large: "h-11 rounded-md px-8",
    medium: "h-9 rounded-md px-3",
    small: "h-8 rounded-md px-2",
  },

  // Input fields
  inputs: {
    large: "h-12 text-lg border-gray-200 focus:border-orange-300",
    medium: "h-10 border-gray-200 focus:border-orange-300",
    small: "h-8 border-gray-200 focus:border-orange-300",
    search: "pl-10 h-12 text-lg border-gray-200 focus:border-orange-300",
    error: "border-red-300 focus:border-red-500",
  },

  // Headers and navigation
  headers: {
    backdrop: "bg-white/80 backdrop-blur-md border-b border-orange-100",
    sticky: "sticky top-0 z-50",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    height: "h-16",
    navigation: "flex items-center justify-between h-16",
  },

  // Brand elements
  brand: {
    logo: "w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center",
    logoLarge: "w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center",
    text: "text-xl font-bold text-gray-900",
    badge: "text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full",
  },

  // Typography
  typography: {
    heroTitle: "text-4xl sm:text-5xl font-bold text-gray-900 mb-4",
    sectionTitle: "text-3xl font-bold text-gray-900 mb-2",
    pageTitle: "text-3xl font-bold text-gray-900 mb-4",
    subtitle: "text-lg text-gray-600 mb-6 max-w-2xl mx-auto",
    caption: "text-sm text-gray-500",
    body: "text-gray-600",
    accent: "text-orange-600",
  },

  // Layout and spacing
  layout: {
    section: "py-16 px-4 sm:px-6 lg:px-8",
    sectionSmall: "py-8 px-4 sm:px-6 lg:px-8",
    container: "max-w-7xl mx-auto",
    containerSmall: "max-w-4xl mx-auto",
    containerForm: "max-w-lg mx-auto",
    fullHeight: "min-h-screen",
    center: "text-center",
  },

  // Interactive states
  interactions: {
    hover: "hover:text-orange-600 transition-colors",
    focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    disabled: "disabled:pointer-events-none disabled:opacity-50",
    transition: "transition-colors duration-300",
    scaleHover: "group-hover:scale-105 transition-transform duration-300",
  },

  // Grid layouts
  grids: {
    responsive: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    responsiveFour: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
    twoCol: "grid grid-cols-1 md:grid-cols-2 gap-6",
    threeCol: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  },

  // Status indicators
  status: {
    success: "text-green-600 bg-green-50 border-green-200",
    error: "text-red-600 bg-red-50 border-red-200",
    warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
    info: "text-blue-600 bg-blue-50 border-blue-200",
  },

  // Restaurant card specific
  restaurantCard: {
    image: "relative h-48 overflow-hidden",
    imageResponsive: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300",
    likeButton: "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
    likeButtonActive: "bg-red-500 hover:bg-red-600 text-white",
    likeButtonInactive: "bg-white/80 hover:bg-white text-gray-600",
    content: "p-4",
    header: "flex items-center justify-between mb-2",
    title: "font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors",
    price: "text-sm font-medium text-gray-600",
    category: "text-sm text-gray-600 mb-2",
    rating: "flex items-center space-x-1",
    ratingIcon: "w-4 h-4 text-yellow-400 fill-current",
    ratingText: "text-sm font-medium",
    ratingCount: "text-sm text-gray-500",
  },

  // Form elements
  forms: {
    group: "space-y-4",
    field: "space-y-2",
    label: "text-sm font-medium text-gray-700",
    errorText: "text-sm text-red-600",
    successText: "text-sm text-green-600",
    helpText: "text-sm text-gray-500",
  },

  // Animations
  animations: {
    fadeIn: "animate-fade-in",
    slideIn: "animate-slide-in",
    pulse: "animate-pulse",
    spin: "animate-spin",
    bounce: "animate-bounce",
  },
} as const;

// Utility function to combine design tokens
export const combineTokens = (...tokens: string[]) => tokens.join(" ");

// Helper functions for common patterns
export const createCard = (variant: keyof typeof designTokens.cards = "standard") => 
  designTokens.cards[variant];

export const createButton = (
  variant: keyof typeof designTokens.buttons = "primary",
  size: keyof typeof designTokens.buttons = "medium"
) => combineTokens(designTokens.buttons[variant], designTokens.buttons[size]);

export const createInput = (
  size: keyof typeof designTokens.inputs = "medium",
  hasError = false
) => combineTokens(
  designTokens.inputs[size],
  hasError ? designTokens.inputs.error : ""
);

export const createSection = (size: "large" | "small" = "large") => 
  size === "large" ? designTokens.layout.section : designTokens.layout.sectionSmall;

// Export individual token categories for tree-shaking
export const { gradients, cards, buttons, inputs, headers, brand, typography, layout, interactions, grids, status, restaurantCard, forms, animations } = designTokens;
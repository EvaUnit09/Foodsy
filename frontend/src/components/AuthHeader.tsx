import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/button";
import { headers, brand, interactions } from "@/styles/design-tokens";

interface AuthHeaderProps {
  showProfile?: boolean;
  profileText?: string;
  backLink?: string;
  backText?: string;
}

/**
 * Authentication Header Component
 * 
 * Displays user authentication status and provides login/logout functionality.
 * Uses OAuth2 Google authentication only.
 */
export const AuthHeader: React.FC<AuthHeaderProps> = ({ 
  showProfile = true, 
  profileText = "Profile",
  backLink = "/",
  backText = "Back to Home"
}) => {
  return (
    <header className={headers.backdrop}>
      <div className={headers.container}>
        <div className={headers.navigation}>
          <div className="flex items-center space-x-4">
            <Link
              href={backLink}
              className={`flex items-center space-x-2 text-gray-600 ${interactions.hover}`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{backText}</span>
            </Link>
            <div className="flex items-center space-x-2">
              <div className={brand.logo}>
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className={brand.text}>Foodsy</span>
              <span className={brand.badge}>
                NY
              </span>
            </div>
          </div>

          {showProfile && (
            <Button variant="ghost" size="sm">
              <User className="w-4 h-4 mr-2" />
              {profileText}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
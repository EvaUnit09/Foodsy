#!/usr/bin/env python3
"""
populate-restaurant-cache.py
Python script to populate restaurant cache for all NYC boroughs using Foodsy API
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from typing import List, Optional, Dict, Any


class Colors:
    """ANSI color codes for terminal output"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color


class Logger:
    """Simple logger with colored output"""
    
    @staticmethod
    def info(message: str):
        print(f"{Colors.BLUE}[INFO]{Colors.NC} {message}")
    
    @staticmethod
    def success(message: str):
        print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {message}")
    
    @staticmethod
    def warning(message: str):
        print(f"{Colors.YELLOW}[WARNING]{Colors.NC} {message}")
    
    @staticmethod
    def error(message: str):
        print(f"{Colors.RED}[ERROR]{Colors.NC} {message}")


class FoodsyAPIClient:
    """Client for Foodsy API operations"""
    
    def __init__(self, backend_url: str, retry_count: int = 3, retry_delay: int = 5):
        self.backend_url = backend_url.rstrip('/')
        self.retry_count = retry_count
        self.retry_delay = retry_delay
    
    def make_request(self, method: str, endpoint: str, description: str) -> tuple[bool, Optional[Dict[Any, Any]]]:
        """Make HTTP request with retries"""
        url = f"{self.backend_url}{endpoint}"
        
        for attempt in range(1, self.retry_count + 1):
            Logger.info(f"Attempt {attempt}/{self.retry_count}: {description}")
            
            try:
                if method == "GET":
                    request = urllib.request.Request(url, method=method)
                else:
                    request = urllib.request.Request(url, data=b'', method=method)
                
                with urllib.request.urlopen(request, timeout=30) as response:
                    if response.status in [200, 201]:
                        Logger.success(f"{description} completed successfully")
                        try:
                            body = response.read().decode('utf-8')
                            return True, json.loads(body) if body else None
                        except json.JSONDecodeError:
                            return True, None
                    else:
                        Logger.warning(f"{description} returned HTTP {response.status}")
                        
            except urllib.error.HTTPError as e:
                if e.code in [302, 401]:
                    Logger.error(f"{description} failed: Authentication required (HTTP {e.code})")
                    Logger.error("Please ensure you're authenticated or the API allows anonymous access")
                    return False, None
                elif e.code == 404:
                    Logger.error(f"{description} failed: Endpoint not found (HTTP {e.code})")
                    return False, None
                else:
                    Logger.warning(f"{description} failed with HTTP code: {e.code}")
                    
            except urllib.error.URLError as e:
                Logger.warning(f"{description} failed: {e.reason}")
                
            except Exception as e:
                Logger.warning(f"{description} failed: {str(e)}")
            
            if attempt < self.retry_count:
                Logger.info(f"Retrying in {self.retry_delay} seconds...")
                time.sleep(self.retry_delay)
        
        Logger.error(f"{description} failed after {self.retry_count} attempts")
        return False, None
    
    def populate_borough(self, borough: str, dry_run: bool = False) -> bool:
        """Populate restaurant cache for a specific borough"""
        Logger.info(f"Processing borough: {borough}")
        
        if dry_run:
            Logger.info(f"[DRY RUN] Would refresh restaurant data for {borough}")
            return True
        
        endpoint = f"/homepage/refresh/{borough}"
        success, result = self.make_request("POST", endpoint, f"Refreshing {borough} restaurant data")
        
        if success:
            Logger.success(f"Successfully populated restaurant cache for {borough}")
            
            if result:
                count = result.get('restaurantsRefreshed', 'unknown')
                time_ms = result.get('refreshTimeMs', 'unknown')
                Logger.info(f"  - Restaurants refreshed: {count}")
                Logger.info(f"  - Time taken: {time_ms}ms")
            
            return True
        else:
            Logger.error(f"Failed to populate restaurant cache for {borough}")
            return False
    
    def update_trending_scores(self, borough: str, dry_run: bool = False) -> bool:
        """Update trending scores for a specific borough"""
        if dry_run:
            Logger.info(f"[DRY RUN] Would update trending scores for {borough}")
            return True
        
        endpoint = f"/homepage/trending/update/{borough}"
        success, result = self.make_request("POST", endpoint, f"Updating trending scores for {borough}")
        
        if success:
            Logger.success(f"Successfully updated trending scores for {borough}")
            return True
        else:
            Logger.warning(f"Failed to update trending scores for {borough} (non-critical)")
            return True  # Don't fail the whole script for trending updates
    
    def get_cache_stats(self, dry_run: bool = False) -> None:
        """Get and display cache statistics"""
        if dry_run:
            Logger.info("[DRY RUN] Would fetch cache statistics")
            return
        
        Logger.info("Fetching cache statistics...")
        
        endpoint = "/homepage/health"
        success, result = self.make_request("GET", endpoint, "Fetching cache statistics")
        
        if success and result:
            status = result.get('status', 'unknown')
            total = result.get('totalRestaurants', 'unknown')
            Logger.success(f"Cache Status: {status}")
            Logger.success(f"Total Restaurants: {total}")
        elif success:
            Logger.success("Cache statistics retrieved successfully")
        else:
            Logger.warning("Could not fetch cache statistics")
    
    def get_trending_stats(self, boroughs: List[str], dry_run: bool = False) -> None:
        """Get and display trending statistics for all boroughs"""
        if dry_run:
            Logger.info("[DRY RUN] Would fetch trending statistics for all boroughs")
            return
        
        Logger.info("Fetching trending statistics for all boroughs...")
        
        for borough in boroughs:
            endpoint = f"/homepage/trending/stats/{borough}"
            success, result = self.make_request("GET", endpoint, f"Fetching trending stats for {borough}")
            
            if success and result:
                trending_stats = result.get('trendingStats', {})
                min_score = trending_stats.get('minScore', 'N/A')
                max_score = trending_stats.get('maxScore', 'N/A')
                avg_score = trending_stats.get('avgScore', 'N/A')
                total = trending_stats.get('totalRestaurants', 'N/A')
                
                Logger.success(f"{borough} Trending Stats:")
                Logger.info(f"  - Restaurants with trending scores: {total}")
                Logger.info(f"  - Score range: {min_score} - {max_score}")
                Logger.info(f"  - Average score: {avg_score}")
            else:
                Logger.warning(f"Could not fetch trending statistics for {borough}")


def main():
    """Main function"""
    boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx"]
    
    parser = argparse.ArgumentParser(
        description="Populate restaurant cache for all NYC boroughs using the Foodsy API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                    # Populate all boroughs
  %(prog)s -b Manhattan                       # Populate only Manhattan
  %(prog)s -u http://localhost:8080 -s -t     # Use local backend with stats and trending
  %(prog)s --dry-run                          # Show what would be done
        """
    )
    
    parser.add_argument(
        '-u', '--url',
        default='https://apifoodsy-backend.com',
        help='Backend URL (default: https://apifoodsy-backend.com)'
    )
    parser.add_argument(
        '-b', '--borough',
        choices=boroughs,
        help='Populate only specific borough'
    )
    parser.add_argument(
        '-r', '--retry',
        type=int,
        default=3,
        help='Number of retries for failed requests (default: 3)'
    )
    parser.add_argument(
        '-d', '--delay',
        type=int,
        default=5,
        help='Delay between retries in seconds (default: 5)'
    )
    parser.add_argument(
        '-s', '--stats',
        action='store_true',
        help='Show cache statistics after population'
    )
    parser.add_argument(
        '-t', '--trending',
        action='store_true',
        help='Update trending scores after population'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making requests'
    )
    
    args = parser.parse_args()
    
    # Initialize API client
    client = FoodsyAPIClient(args.url, args.retry, args.delay)
    
    # Determine which boroughs to process
    boroughs_to_process = [args.borough] if args.borough else boroughs
    
    # Start processing
    print("=" * 39)
    print("Foodsy Restaurant Cache Population Tool")
    print("=" * 39)
    print()
    
    Logger.info(f"Backend URL: {args.url}")
    Logger.info(f"Retry count: {args.retry}")
    Logger.info(f"Retry delay: {args.delay}s")
    
    if args.dry_run:
        Logger.warning("DRY RUN MODE - No actual requests will be made")
    
    print()
    
    # Population phase
    Logger.info("Starting restaurant cache population...")
    success_count = 0
    total_count = len(boroughs_to_process)
    
    for borough in boroughs_to_process:
        if client.populate_borough(borough, args.dry_run):
            success_count += 1
        print()  # Add spacing between boroughs
    
    # Summary of population
    print("=" * 39)
    Logger.info("Population Summary:")
    Logger.success(f"Successful: {success_count}/{total_count} boroughs")
    
    if success_count == total_count:
        Logger.success("All boroughs populated successfully!")
    elif success_count > 0:
        Logger.warning("Some boroughs failed to populate")
    else:
        Logger.error("All boroughs failed to populate")
        sys.exit(1)
    
    print()
    
    # Trending scores update phase
    if args.trending:
        Logger.info("Starting trending scores update...")
        
        for borough in boroughs_to_process:
            client.update_trending_scores(borough, args.dry_run)
        
        print()
    
    # Statistics phase
    if args.stats:
        print("=" * 39)
        client.get_cache_stats(args.dry_run)
        print()
        client.get_trending_stats(boroughs_to_process, args.dry_run)
        print("=" * 39)
    
    Logger.success("Restaurant cache population completed!")
    
    if not args.dry_run:
        Logger.info("Your dashboard should now show restaurant recommendations.")
        Logger.info("Visit your Foodsy dashboard to see the results!")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        Logger.warning("Operation cancelled by user")
        sys.exit(130)
    except Exception as e:
        Logger.error(f"Unexpected error: {str(e)}")
        sys.exit(1)
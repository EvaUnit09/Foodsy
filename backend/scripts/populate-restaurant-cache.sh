#!/bin/bash

# populate-restaurant-cache.sh
# Script to populate restaurant cache for all NYC boroughs using Foodsy API

set -e  # Exit on any error

# Configuration
BACKEND_URL="${BACKEND_URL:-https://apifoodsy-backend.com}"
BOROUGHS=("Manhattan" "Brooklyn" "Queens" "Bronx")
RETRY_COUNT=3
RETRY_DELAY=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Populate restaurant cache for all NYC boroughs using the Foodsy API.

OPTIONS:
    -h, --help              Show this help message
    -u, --url URL          Backend URL (default: https://apifoodsy-backend.com)
    -b, --borough BOROUGH  Populate only specific borough (Manhattan|Brooklyn|Queens|Bronx)
    -r, --retry COUNT      Number of retries for failed requests (default: 3)
    -d, --delay SECONDS    Delay between retries in seconds (default: 5)
    -s, --stats            Show cache statistics after population
    -t, --trending         Update trending scores after population
    --dry-run              Show what would be done without making requests

EXAMPLES:
    $0                                    # Populate all boroughs
    $0 -b Manhattan                       # Populate only Manhattan
    $0 -u http://localhost:8080 -s -t     # Use local backend with stats and trending
    $0 --dry-run                          # Show what would be done

EOF
}

# Function to make API request with retries
make_request() {
    local method="$1"
    local url="$2"
    local description="$3"
    local retry_count="$4"
    
    for ((i=1; i<=retry_count; i++)); do
        log_info "Attempt $i/$retry_count: $description"
        
        if [ "$method" = "GET" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url" 2>/dev/null || echo "HTTPSTATUS:000")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$url" 2>/dev/null || echo "HTTPSTATUS:000")
        fi
        
        http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
        body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
        
        if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
            log_success "$description completed successfully"
            echo "$body"
            return 0
        elif [ "$http_code" -eq 302 ] || [ "$http_code" -eq 401 ]; then
            log_error "$description failed: Authentication required (HTTP $http_code)"
            log_error "Please ensure you're authenticated or the API allows anonymous access"
            return 1
        elif [ "$http_code" -eq 404 ]; then
            log_error "$description failed: Endpoint not found (HTTP $http_code)"
            return 1
        else
            log_warning "$description failed with HTTP code: $http_code"
            if [ $i -lt $retry_count ]; then
                log_info "Retrying in $RETRY_DELAY seconds..."
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    log_error "$description failed after $retry_count attempts"
    return 1
}

# Function to populate a single borough
populate_borough() {
    local borough="$1"
    local dry_run="$2"
    
    log_info "Processing borough: $borough"
    
    if [ "$dry_run" = "true" ]; then
        log_info "[DRY RUN] Would refresh restaurant data for $borough"
        return 0
    fi
    
    local url="$BACKEND_URL/homepage/refresh/$borough"
    local result=$(make_request "POST" "$url" "Refreshing $borough restaurant data" "$RETRY_COUNT")
    
    if [ $? -eq 0 ]; then
        log_success "Successfully populated restaurant cache for $borough"
        
        # Try to parse the response for more details
        if command -v jq &> /dev/null; then
            if echo "$result" | jq -e . >/dev/null 2>&1; then
                local count=$(echo "$result" | jq -r '.restaurantsRefreshed // "unknown"')
                local time_ms=$(echo "$result" | jq -r '.refreshTimeMs // "unknown"')
                log_info "  - Restaurants refreshed: $count"
                log_info "  - Time taken: ${time_ms}ms"
            fi
        fi
        return 0
    else
        log_error "Failed to populate restaurant cache for $borough"
        return 1
    fi
}

# Function to update trending scores for a borough
update_trending_scores() {
    local borough="$1"
    local dry_run="$2"
    
    if [ "$dry_run" = "true" ]; then
        log_info "[DRY RUN] Would update trending scores for $borough"
        return 0
    fi
    
    local url="$BACKEND_URL/homepage/trending/update/$borough"
    local result=$(make_request "POST" "$url" "Updating trending scores for $borough" "$RETRY_COUNT")
    
    if [ $? -eq 0 ]; then
        log_success "Successfully updated trending scores for $borough"
        return 0
    else
        log_warning "Failed to update trending scores for $borough (non-critical)"
        return 0  # Don't fail the whole script for trending updates
    fi
}

# Function to get cache statistics
get_cache_stats() {
    local dry_run="$1"
    
    if [ "$dry_run" = "true" ]; then
        log_info "[DRY RUN] Would fetch cache statistics"
        return 0
    fi
    
    log_info "Fetching cache statistics..."
    
    local url="$BACKEND_URL/homepage/health"
    local result=$(make_request "GET" "$url" "Fetching cache statistics" 2)
    
    if [ $? -eq 0 ]; then
        if command -v jq &> /dev/null; then
            if echo "$result" | jq -e . >/dev/null 2>&1; then
                local total=$(echo "$result" | jq -r '.totalRestaurants // "unknown"')
                local status=$(echo "$result" | jq -r '.status // "unknown"')
                log_success "Cache Status: $status"
                log_success "Total Restaurants: $total"
            else
                log_success "Cache statistics retrieved (raw): $result"
            fi
        else
            log_success "Cache statistics retrieved: $result"
        fi
    else
        log_warning "Could not fetch cache statistics"
    fi
}

# Function to get trending statistics for all boroughs
get_trending_stats() {
    local dry_run="$1"
    
    if [ "$dry_run" = "true" ]; then
        log_info "[DRY RUN] Would fetch trending statistics for all boroughs"
        return 0
    fi
    
    log_info "Fetching trending statistics for all boroughs..."
    
    for borough in "${BOROUGHS[@]}"; do
        local url="$BACKEND_URL/homepage/trending/stats/$borough"
        local result=$(make_request "GET" "$url" "Fetching trending stats for $borough" 2)
        
        if [ $? -eq 0 ]; then
            if command -v jq &> /dev/null; then
                if echo "$result" | jq -e . >/dev/null 2>&1; then
                    local min_score=$(echo "$result" | jq -r '.trendingStats.minScore // "N/A"')
                    local max_score=$(echo "$result" | jq -r '.trendingStats.maxScore // "N/A"')
                    local avg_score=$(echo "$result" | jq -r '.trendingStats.avgScore // "N/A"')
                    local total=$(echo "$result" | jq -r '.trendingStats.totalRestaurants // "N/A"')
                    
                    log_success "$borough Trending Stats:"
                    log_info "  - Restaurants with trending scores: $total"
                    log_info "  - Score range: $min_score - $max_score"
                    log_info "  - Average score: $avg_score"
                else
                    log_info "$borough: $result"
                fi
            else
                log_info "$borough: $result"
            fi
        else
            log_warning "Could not fetch trending statistics for $borough"
        fi
    done
}

# Main function
main() {
    local specific_borough=""
    local show_stats=false
    local update_trending=false
    local dry_run=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -u|--url)
                BACKEND_URL="$2"
                shift 2
                ;;
            -b|--borough)
                specific_borough="$2"
                shift 2
                ;;
            -r|--retry)
                RETRY_COUNT="$2"
                shift 2
                ;;
            -d|--delay)
                RETRY_DELAY="$2"
                shift 2
                ;;
            -s|--stats)
                show_stats=true
                shift
                ;;
            -t|--trending)
                update_trending=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use -h or --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Validate specific borough if provided
    if [ -n "$specific_borough" ]; then
        if [[ ! " ${BOROUGHS[@]} " =~ " ${specific_borough} " ]]; then
            log_error "Invalid borough: $specific_borough"
            log_error "Valid boroughs: ${BOROUGHS[*]}"
            exit 1
        fi
    fi
    
    # Start processing
    echo "======================================="
    echo "Foodsy Restaurant Cache Population Tool"
    echo "======================================="
    echo
    
    log_info "Backend URL: $BACKEND_URL"
    log_info "Retry count: $RETRY_COUNT"
    log_info "Retry delay: ${RETRY_DELAY}s"
    
    if [ "$dry_run" = "true" ]; then
        log_warning "DRY RUN MODE - No actual requests will be made"
    fi
    
    echo
    
    # Determine which boroughs to process
    local boroughs_to_process=()
    if [ -n "$specific_borough" ]; then
        boroughs_to_process=("$specific_borough")
    else
        boroughs_to_process=("${BOROUGHS[@]}")
    fi
    
    # Population phase
    log_info "Starting restaurant cache population..."
    local success_count=0
    local total_count=${#boroughs_to_process[@]}
    
    for borough in "${boroughs_to_process[@]}"; do
        if populate_borough "$borough" "$dry_run"; then
            ((success_count++))
        fi
        echo  # Add spacing between boroughs
    done
    
    # Summary of population
    echo "======================================="
    log_info "Population Summary:"
    log_success "Successful: $success_count/$total_count boroughs"
    
    if [ $success_count -eq $total_count ]; then
        log_success "All boroughs populated successfully!"
    elif [ $success_count -gt 0 ]; then
        log_warning "Some boroughs failed to populate"
    else
        log_error "All boroughs failed to populate"
        exit 1
    fi
    
    echo
    
    # Trending scores update phase
    if [ "$update_trending" = "true" ]; then
        log_info "Starting trending scores update..."
        
        for borough in "${boroughs_to_process[@]}"; do
            update_trending_scores "$borough" "$dry_run"
        done
        
        echo
    fi
    
    # Statistics phase
    if [ "$show_stats" = "true" ]; then
        echo "======================================="
        get_cache_stats "$dry_run"
        echo
        get_trending_stats "$dry_run"
        echo "======================================="
    fi
    
    log_success "Restaurant cache population completed!"
    
    if [ "$dry_run" = "false" ]; then
        log_info "Your dashboard should now show restaurant recommendations."
        log_info "Visit your Foodsy dashboard to see the results!"
    fi
}

# Check if jq is available and warn if not
if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed. Install it for better JSON response parsing:"
    log_warning "  macOS: brew install jq"
    log_warning "  Ubuntu/Debian: sudo apt-get install jq"
    log_warning "  CentOS/RHEL: sudo yum install jq"
    echo
fi

# Run main function with all arguments
main "$@"
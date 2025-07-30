#!/bin/bash
# Fooidsy Backend Deployment Script

set -e

echo "Starting Foodsy Backend Deployment...."

# Configuration
APP_NAME="foodsy-backend"
APP_DIR="/home/ubuntu/foodsy"
COMPOSE_FILE="docker-compose.prod.yml"

Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
    }
    print_warning() {
        echo -e "${YELLOW}[WARNING]${NC} $1"
        }

        print_error() {
            echo -e "${RED}[ERROR]${NC} $1"
            }
        }
    }
}

if [ "$USER" != "ubuntu" ]; then
	print_error "This script should be run as ubuntu user"
	exit 1
fi

# Navigate to app dir
if [ ! -d "$APP_DIR" ]; then
	print_error "App directory $APP_DIR not found!"
	exit 1
fi

# Pull latest code 
if [ -d ".git" ]; then
	print_status "Pulling latest code from git..."
	git pull origin main || print_warning "Git pull failed or not configured"
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down || print_warning "No containers to stop"

# Remove old images
print_status "Removing old images..."
docker image prune -f || print_warning "Failed to prune images"

# Build new image
print_status "Building new Docker image..."
docker build -t "$APP_NAME" .

# Start services
print_status "Starting services with Docker Compose..."
docker-compose -f "$COMPOSE_FILE" up -d

print_status "Waiting for services to start..."
sleep 10

# Check if container is running
if docker ps | grep -q "$APP_NAME"; then
	print_status "Container is running!"
else
	print_error "Container failed to start!"
	print_status "Checking logs..."
	docker-compose -f "$COMPOSE_FILE" logs --tail=20
	exit 1
fi

# Test health endpoint
print_status "Testing health endpoint..."
if curl -f http://localhost:8080/api/actuator/health > /dev/null 2>&1; then
	print_status "Health check passed"
else
	print_warning "Health check failed - service might still be starting"
	print_status "Check logs with: docker-compose -f $COMPOSE_FILE logs -f"
fi

# Show container status
print_status "Container status:"
docker ps | grep "$APP_NAME" || echo "No containers found"

print_status "Recent logs:"
docker-compose -f "$COMPOSE_FULE" logs --tail=10

print_status "Deployment complete"
print_status "Monitor logs with: docker-compose -f $COMPOSE_FILE logs -f"
print_status "Stop services with: docker-compose -f $COMPOSE_FILE down"



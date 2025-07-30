#!/bin/bash

# Foodsy Server Initial Setup Script
# Run this script on your EC2 instance as ubuntu user
# This covers steps 6-9 from your deployment documentation

set -e  # Exit on any error

echo "🚀 Starting Foodsy Server Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    print_error "This script should be run as ubuntu user"
    exit 1
fi

print_step "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "✅ System updated successfully"

print_step "Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt install docker.io -y
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ubuntu
    print_status "✅ Docker installed successfully"
else
    print_status "✅ Docker already installed"
fi

print_step "Step 3: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo apt install docker-compose -y
    print_status "✅ Docker Compose installed successfully"
else
    print_status "✅ Docker Compose already installed"
fi

print_step "Step 4: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_status "✅ Nginx installed successfully"
else
    print_status "✅ Nginx already installed"
fi

print_step "Step 5: Installing Certbot for SSL..."
if ! command -v certbot &> /dev/null; then
    sudo apt install certbot python3-certbot-nginx -y
    print_status "✅ Certbot installed successfully"
else
    print_status "✅ Certbot already installed"
fi

print_step "Step 6: Installing additional utilities..."
sudo apt install -y curl wget unzip git htop tree jq
print_status "✅ Additional utilities installed"

print_step "Step 7: Configuring UFW Firewall..."
# Check if UFW is active
if sudo ufw status | grep -q "Status: active"; then
    print_status "UFW is already active"
else
    print_status "Configuring UFW firewall rules..."
    sudo ufw --force reset  # Reset to defaults
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 22/tcp comment 'SSH'
    sudo ufw allow 80/tcp comment 'HTTP'
    sudo ufw allow 443/tcp comment 'HTTPS'
    sudo ufw allow 8080/tcp comment 'Backend (temporary)'
    sudo ufw --force enable
    print_status "✅ UFW firewall configured"
fi

print_step "Step 8: Creating application directories..."
mkdir -p /home/ubuntu/foodsy
mkdir -p /home/ubuntu/logs
mkdir -p /home/ubuntu/backups
print_status "✅ Application directories created"

print_step "Step 9: Setting up log rotation..."
sudo tee /etc/logrotate.d/foodsy > /dev/null <<EOF
/home/ubuntu/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 ubuntu ubuntu
}
EOF
print_status "✅ Log rotation configured"

print_step "Step 10: Creating systemd service for monitoring..."
sudo tee /etc/systemd/system/foodsy-monitor.service > /dev/null <<EOF
[Unit]
Description=Foodsy Application Monitor
After=network.target

[Service]
Type=oneshot
User=ubuntu
ExecStart=/home/ubuntu/monitor.sh

[Install]
WantedBy=multi-user.target
EOF

# Create basic monitoring script
tee /home/ubuntu/monitor.sh > /dev/null <<'EOF'
#!/bin/bash
# Basic health monitoring script

LOG_FILE="/home/ubuntu/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if backend container is running
if docker ps | grep -q "foodsy-backend"; then
    echo "[$DATE] Backend container is running" >> $LOG_FILE
else
    echo "[$DATE] ERROR: Backend container is not running" >> $LOG_FILE
    # Restart container (uncomment if desired)
    # cd /home/ubuntu/foodsy/backend && docker-compose -f docker-compose.prod.yml up -d
fi

# Check health endpoint
if curl -f http://localhost:8080/api/actuator/health > /dev/null 2>&1; then
    echo "[$DATE] Health check passed" >> $LOG_FILE
else
    echo "[$DATE] WARNING: Health check failed" >> $LOG_FILE
fi
EOF

chmod +x /home/ubuntu/monitor.sh
sudo systemctl enable foodsy-monitor.service
print_status "✅ Monitoring service created"

print_step "Step 11: Installing fail2ban for security..."
if ! command -v fail2ban-server &> /dev/null; then
    sudo apt install fail2ban -y
    sudo systemctl start fail2ban
    sudo systemctl enable fail2ban
    print_status "✅ fail2ban installed and configured"
else
    print_status "✅ fail2ban already installed"
fi

print_step "Step 12: Configuring SSH security..."
# Backup original sshd_config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Apply security hardening (uncomment as needed)
# sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
# sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
# sudo systemctl restart sshd

print_status "✅ SSH configuration backed up (manual hardening recommended)"

print_step "Step 13: Setting up automatic security updates..."
sudo apt install unattended-upgrades -y
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades
print_status "✅ Automatic security updates configured"

print_step "Step 14: Final system information..."
echo ""
print_status "=== SYSTEM INFORMATION ==="
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo "UFW Status: $(sudo ufw status | head -1)"
echo ""

print_status "🎉 Server setup completed successfully!"
echo ""
print_warning "IMPORTANT NEXT STEPS:"
echo "1. Log out and log back in to apply docker group changes: exit"
echo "2. Verify docker works without sudo: docker ps"
echo "3. Transfer your application code to /home/ubuntu/foodsy/"
echo "4. Create .env.production file with your environment variables"
echo "5. Run the deployment script: ./deploy.sh"
echo ""
print_status "Server is ready for application deployment!"

# Check if user needs to log out for docker group
if ! groups | grep -q docker; then
    print_warning "⚠️  Please log out and log back in for docker group changes to take effect"
    echo "After logging back in, test with: docker ps"
fi
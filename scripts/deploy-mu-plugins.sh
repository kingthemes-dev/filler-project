#!/bin/bash

# Script to deploy mu-plugins to WordPress server via SCP
# Usage: bash scripts/deploy-mu-plugins.sh [host] [user] [remote_path]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MU_PLUGINS_DIR="wp-content/mu-plugins"

# Plugins already deployed (confirmed from user)
ALREADY_DEPLOYED=(
    "headless-config.php"
    "king-email-system.php"
    "customer-invoices.php"
    "email-link-redirect.php"
    "king-cart-api.php"
    "king-reviews-api.php"
    "custom-password-reset.php"
    "king-jwt-authentication.php"
)

# Plugins to deploy (from screenshot - 5 files)
PLUGINS_TO_DEPLOY=(
    "king-optimized-api.php"
    "king-shop-api.php"
    "king-webhooks.php"
    "woocommerce-custom-fields.php"
    "order-confirmation.php"
)

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_header() {
    echo -e "\n${CYAN}$1${NC}"
    echo "=========================================="
}

# Check if parameters are provided
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    log_error "Usage: $0 <host> <user> <remote_path>"
    log_info "Example: $0 qvwltjhdjw.cfolks.pl user /home/user/public_html/wp-content/mu-plugins"
    exit 1
fi

SSH_HOST="$1"
SSH_USER="$2"
REMOTE_PATH="$3"

log_header "MU-Plugins Deployment"

# Show already deployed plugins
log_info "Already deployed plugins (from conversation):"
for plugin in "${ALREADY_DEPLOYED[@]}"; do
    log_success "  ✓ $plugin"
done
echo ""

# Check if local files exist
log_info "Checking local files to deploy..."
for plugin in "${PLUGINS_TO_DEPLOY[@]}"; do
    if [ ! -f "$MU_PLUGINS_DIR/$plugin" ]; then
        log_error "File not found: $MU_PLUGINS_DIR/$plugin"
        exit 1
    fi
    log_success "Found: $plugin"
done

# Deploy files
log_header "Deploying mu-plugins to server"

# Deploy plugins
for plugin in "${PLUGINS_TO_DEPLOY[@]}"; do
    log_info "Deploying $plugin..."
    scp "$MU_PLUGINS_DIR/$plugin" "$SSH_USER@$SSH_HOST:$REMOTE_PATH/" || {
        log_error "Failed to deploy $plugin"
        exit 1
    }
    log_success "Deployed: $plugin"
done

log_header "Deployment Complete!"
log_success "All mu-plugins have been deployed successfully"
log_info "Server: $SSH_USER@$SSH_HOST"
log_info "Path: $REMOTE_PATH"


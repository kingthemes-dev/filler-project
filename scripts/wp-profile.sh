#!/bin/bash

# WordPress mu-plugins profiling script
# Profiluje mu-plugins: czas/żądanie, liczba zapytań, autoloaded options
#
# Usage:
#   bash scripts/wp-profile.sh
#   bash scripts/wp-profile.sh --plugin king-optimized-api.php
#   bash scripts/wp-profile.sh --autoload-check

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WP_CLI="wp"
MU_PLUGINS_DIR="wp-content/mu-plugins"
AUTOLOAD_THRESHOLD=1048576 # 1MB in bytes

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

# Check if wp-cli is available
check_wp_cli() {
    if ! command -v $WP_CLI &> /dev/null; then
        log_error "wp-cli not found. Please install wp-cli first."
        exit 1
    fi
    log_success "wp-cli found: $($WP_CLI --version)"
}

# List all mu-plugins
list_mu_plugins() {
    log_header "MU-Plugins Inventory"
    
    if [ ! -d "$MU_PLUGINS_DIR" ]; then
        log_error "MU plugins directory not found: $MU_PLUGINS_DIR"
        exit 1
    fi
    
    echo "MU Plugins directory: $MU_PLUGINS_DIR"
    echo ""
    
    local plugins=($(ls -1 "$MU_PLUGINS_DIR"/*.php 2>/dev/null || true))
    local count=${#plugins[@]}
    
    if [ $count -eq 0 ]; then
        log_warning "No mu-plugins found"
        return
    fi
    
    log_info "Found $count mu-plugins:"
    echo ""
    
    for plugin in "${plugins[@]}"; do
        local basename=$(basename "$plugin")
        local version=$(grep -i "Version:" "$plugin" | head -1 | sed 's/.*Version: *\([0-9.]*\).*/\1/' || echo "N/A")
        local description=$(grep -i "Description:" "$plugin" | head -1 | sed 's/.*Description: *\(.*\)/\1/' || echo "N/A")
        
        echo "  📦 $basename"
        echo "     Version: $version"
        echo "     Description: $description"
        
        # Check HPOS compatibility
        if grep -q "hpos\|HPOS\|OrderUtil" "$plugin" 2>/dev/null; then
            echo "     HPOS: ✅ Compatible"
        else
            echo "     HPOS: ⚠️  Not checked"
        fi
        
        echo ""
    done
    
    echo "Total: $count plugins"
}

# Profile a specific plugin
profile_plugin() {
    local plugin_file="$1"
    
    if [ ! -f "$plugin_file" ]; then
        log_error "Plugin file not found: $plugin_file"
        return 1
    fi
    
    log_header "Profiling: $(basename $plugin_file)"
    
    # Check if Query Monitor is active (for query counting)
    if $WP_CLI plugin is-active query-monitor &>/dev/null; then
        log_success "Query Monitor is active"
    else
        log_warning "Query Monitor not active. Install it for query counting."
    fi
    
    # Profile using wp-cli eval (if available)
    log_info "Profiling plugin execution..."
    
    # Note: This is a simplified version. Real profiling would require:
    # - Query Monitor plugin
    # - Xdebug/profiler
    # - Custom profiling hooks
    
    log_warning "Full profiling requires Query Monitor or Xdebug. Showing basic info:"
    
    # Count lines of code
    local lines=$(wc -l < "$plugin_file")
    echo "  Lines of code: $lines"
    
    # Count functions
    local functions=$(grep -c "function " "$plugin_file" || echo "0")
    echo "  Functions: $functions"
    
    # Check for hooks
    local hooks=$(grep -c "add_action\|add_filter" "$plugin_file" || echo "0")
    echo "  Hooks: $hooks"
    
    # Check for database queries
    local queries=$(grep -c "\$wpdb\|get_option\|update_option\|get_post\|get_posts\|wp_query" "$plugin_file" || echo "0")
    echo "  DB operations: $queries"
}

# Check autoloaded options
check_autoload() {
    log_header "Autoloaded Options Audit"
    
    log_info "Checking autoloaded options larger than 1MB..."
    
    # Get all autoloaded options
    local autoload_json=$($WP_CLI option list --autoload=yes --format=json 2>/dev/null || echo "[]")
    
    if [ "$autoload_json" = "[]" ] || [ -z "$autoload_json" ]; then
        log_warning "Could not fetch autoloaded options"
        return
    fi
    
    # Count total autoloaded options
    local total=$(echo "$autoload_json" | jq '. | length' 2>/dev/null || echo "0")
    log_info "Total autoloaded options: $total"
    
    # Find large options (>1MB)
    local large_options=$(echo "$autoload_json" | jq --argjson threshold $AUTOLOAD_THRESHOLD \
        '.[] | select((.option_value | length) > $threshold) | {name: .option_name, size: (.option_value | length)}' \
        2>/dev/null || echo "[]")
    
    local large_count=$(echo "$large_options" | jq '. | if type == "array" then length else 1 end' 2>/dev/null || echo "0")
    
    if [ "$large_count" -gt 0 ]; then
        log_warning "Found $large_count large autoloaded options (>1MB):"
        echo "$large_options" | jq -r '.[] | "  - \(.name): \(.size / 1024 / 1024 | floor)MB"' 2>/dev/null || echo "$large_options"
    else
        log_success "No large autoloaded options found"
    fi
    
    # Calculate total autoload size
    local total_size=$(echo "$autoload_json" | jq '[.[] | .option_value | length] | add' 2>/dev/null || echo "0")
    local total_size_mb=$(echo "scale=2; $total_size / 1024 / 1024" | bc 2>/dev/null || echo "0")
    
    echo ""
    log_info "Total autoloaded size: ${total_size_mb}MB"
    
    if (( $(echo "$total_size > $AUTOLOAD_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        log_warning "Total autoload size exceeds 1MB threshold"
    else
        log_success "Total autoload size is within limits"
    fi
}

# Check transients
check_transients() {
    log_header "Transients Audit"
    
    log_info "Checking transients..."
    
    local transients=$($WP_CLI transient list --format=json 2>/dev/null || echo "[]")
    local count=$(echo "$transients" | jq '. | length' 2>/dev/null || echo "0")
    
    log_info "Total transients: $count"
    
    if [ "$count" -gt 0 ]; then
        echo "$transients" | jq -r '.[] | "  - \(.name): expires in \(.expiration // "never")"' 2>/dev/null || echo "$transients"
    else
        log_info "No transients found"
    fi
}

# Check object cache
check_object_cache() {
    log_header "Object Cache Audit"
    
    log_info "Checking object cache status..."
    
    if $WP_CLI cache stats &>/dev/null; then
        log_success "Object cache is active"
        $WP_CLI cache stats
    else
        log_warning "Object cache not available or not configured"
    fi
}

# Check for hook conflicts
check_hook_conflicts() {
    log_header "Hook Conflicts Audit"
    
    log_info "Checking for duplicate hooks..."
    
    # This is a simplified check. Real conflict detection would require:
    # - Query Monitor
    # - Custom profiling hooks
    
    log_warning "Full hook conflict detection requires Query Monitor or custom profiling"
    
    # Basic check: find duplicate hook names
    local all_hooks=$(grep -r "add_action\|add_filter" "$MU_PLUGINS_DIR"/*.php 2>/dev/null | \
        sed -n "s/.*add_[a-z]*(['\"]\([^'\"]*\)['\"].*/\1/p" | sort)
    
    local duplicates=$(echo "$all_hooks" | uniq -d)
    
    if [ -n "$duplicates" ]; then
        log_warning "Found potential duplicate hooks:"
        echo "$duplicates" | while read hook; do
            echo "  - $hook"
        done
    else
        log_success "No obvious duplicate hooks found"
    fi
}

# Generate report
generate_report() {
    log_header "Generating Report"
    
    local report_file="wp-profile-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "WordPress mu-plugins Profiling Report"
        echo "Generated: $(date)"
        echo "=========================================="
        echo ""
        list_mu_plugins
        echo ""
        check_autoload
        echo ""
        check_transients
        echo ""
        check_object_cache
        echo ""
        check_hook_conflicts
    } > "$report_file"
    
    log_success "Report saved to: $report_file"
}

# Main
main() {
    echo -e "${CYAN}"
    echo "🔍 WordPress mu-plugins Profiling Script"
    echo "=========================================="
    echo -e "${NC}"
    
    check_wp_cli
    
    # Parse arguments
    if [ "$1" = "--autoload-check" ]; then
        check_autoload
        exit 0
    fi
    
    if [ "$1" = "--plugin" ] && [ -n "$2" ]; then
        profile_plugin "$2"
        exit 0
    fi
    
    # Run all checks
    list_mu_plugins
    check_autoload
    check_transients
    check_object_cache
    check_hook_conflicts
    
    # Generate report
    generate_report
    
    log_success "Profiling complete!"
}

# Run main
main "$@"


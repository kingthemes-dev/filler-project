#!/bin/bash
# Deploy MU Plugins to server
# Usage: ./scripts/deploy-mu-plugins.sh [plugin-name]

SSH_USER="qvwltjhdjw"
SSH_HOST="s62.cyber-folks.pl"
SSH_PORT="222"
SSH_PASS="Haslo963!@#"
REMOTE_PATH="/domains/qvwltjhdjw.cfolks.pl/public_html/wp-content/mu-plugins"
LOCAL_PATH="wp-content/mu-plugins"

# Check if sshpass is available
if command -v sshpass &> /dev/null; then
    SSHPASS_CMD="sshpass -p '$SSH_PASS'"
else
    echo "⚠️  sshpass not found. Install it with: brew install hudochenkov/sshpass/sshpass (macOS) or apt-get install sshpass (Linux)"
    echo "📝 Alternatively, you can manually upload files using:"
    echo "   scp -P $SSH_PORT wp-content/mu-plugins/PLUGIN_FILE $SSH_USER@$SSH_HOST:$REMOTE_PATH/"
    exit 1
fi

# Function to deploy a plugin
deploy_plugin() {
    local plugin_file=$1
    local local_file="$LOCAL_PATH/$plugin_file"
    local remote_file="$REMOTE_PATH/$plugin_file"
    
    if [ ! -f "$local_file" ]; then
        echo "❌ File not found: $local_file"
        return 1
    fi
    
    echo "📤 Deploying $plugin_file..."
    
    # Upload file
    if $SSHPASS_CMD scp -P $SSH_PORT -o StrictHostKeyChecking=no "$local_file" "$SSH_USER@$SSH_HOST:$remote_file"; then
        echo "✅ Successfully deployed $plugin_file"
        return 0
    else
        echo "❌ Failed to deploy $plugin_file"
        return 1
    fi
}

# If plugin name provided, deploy only that plugin
if [ -n "$1" ]; then
    deploy_plugin "$1"
else
    # Deploy all updated plugins
    echo "🚀 Deploying updated MU plugins..."
    deploy_plugin "king-jwt-authentication.php"
    deploy_plugin "custom-password-reset.php"
    echo "✅ Deployment complete!"
fi

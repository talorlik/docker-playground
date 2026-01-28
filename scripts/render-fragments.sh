#!/bin/bash

# Script to render fragment files using YAML anchor substitution
# Since YAML anchors don't support variable substitution directly,
# we use sed to replace the anchor references based on deployment mode
# Usage: ./render-fragments.sh <swarm|proxy>

set -e

DEPLOYMENT_MODE="${1:-swarm}"

if [ "$DEPLOYMENT_MODE" != "swarm" ] && [ "$DEPLOYMENT_MODE" != "proxy" ]; then
    echo "ERROR: Deployment mode must be 'swarm' or 'proxy'"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAGMENTS_DIR="$(cd "$SCRIPT_DIR/../fragments" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Rendering fragments for $DEPLOYMENT_MODE mode..."

# Process docker-compose.yaml for conditional includes
compose_file="$PROJECT_DIR/docker-compose.yaml"
if [ -f "$compose_file" ]; then
    temp_file="${compose_file}.tmp"

    # Replace ${PROXY_INCLUDE} placeholder based on deployment mode
    if [ "$DEPLOYMENT_MODE" == "swarm" ]; then
        # Swarm mode: remove placeholder line or proxy.yaml line
        sed -E '/\$\{PROXY_INCLUDE\}|- fragments\/proxy.yaml/d' "$compose_file" > "$temp_file"
    else
        # Proxy mode: replace placeholder with proxy.yaml, or ensure it exists after frontend.yaml
        if grep -q '\${PROXY_INCLUDE}' "$compose_file"; then
            # Placeholder exists, replace it
            sed 's/\${PROXY_INCLUDE}/  - fragments\/proxy.yaml/' "$compose_file" > "$temp_file"
        else
            # Placeholder doesn't exist, check if proxy.yaml is already there
            if ! grep -q 'fragments/proxy.yaml' "$compose_file"; then
                # Add proxy.yaml after frontend.yaml line
                sed '/- fragments\/frontend.yaml/a\
  - fragments/proxy.yaml' "$compose_file" > "$temp_file"
            else
                # Already has proxy.yaml, just copy
                cp "$compose_file" "$temp_file"
            fi
        fi
    fi

    mv "$temp_file" "$compose_file"
    echo "  Rendered docker-compose.yaml for $DEPLOYMENT_MODE mode"
fi

# Process fragment files that use anchor substitution
for fragment_file in backend.yaml frontend.yaml networks-volumes.yaml; do
    fragment_path="$FRAGMENTS_DIR/$fragment_file"

    if [ ! -f "$fragment_path" ]; then
        echo "  Warning: $fragment_file not found, skipping..."
        continue
    fi

    # Create a temporary file
    temp_file="${fragment_path}.tmp"

    # Replace anchor references based on deployment mode
    # Pattern: *${DEPLOYMENT_MODE}-ports becomes *swarm-ports or *proxy-ports
    # Pattern: *${DEPLOYMENT_MODE}-deploy becomes *swarm-deploy or *proxy-deploy
    # Pattern: *${DEPLOYMENT_MODE}-network becomes *swarm-network or *proxy-network

    # Replace anchor references based on deployment mode
    # Need to escape $ and { } for sed, and handle both swarm and proxy replacements
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS/BSD sed - need to escape $ and braces
        sed -E \
            -e "s/\*\\\$\{DEPLOYMENT_MODE\}-ports/\*${DEPLOYMENT_MODE}-ports/g" \
            -e "s/\*\\\$\{DEPLOYMENT_MODE\}-deploy/\*${DEPLOYMENT_MODE}-deploy/g" \
            -e "s/\*\\\$\{DEPLOYMENT_MODE\}-network/\*${DEPLOYMENT_MODE}-network/g" \
            -e "s/\*swarm-ports/\*${DEPLOYMENT_MODE}-ports/g" \
            -e "s/\*swarm-deploy/\*${DEPLOYMENT_MODE}-deploy/g" \
            -e "s/\*swarm-network/\*${DEPLOYMENT_MODE}-network/g" \
            -e "s/\*proxy-ports/\*${DEPLOYMENT_MODE}-ports/g" \
            -e "s/\*proxy-deploy/\*${DEPLOYMENT_MODE}-deploy/g" \
            -e "s/\*proxy-network/\*${DEPLOYMENT_MODE}-network/g" \
            "$fragment_path" > "$temp_file"
    else
        # GNU sed
        sed -E \
            -e "s/\*\\\$\{DEPLOYMENT_MODE\}-ports/\*${DEPLOYMENT_MODE}-ports/g" \
            -e "s/\*\\\$\{DEPLOYMENT_MODE\}-deploy/\*${DEPLOYMENT_MODE}-deploy/g" \
            -e "s/\*\\\$\{DEPLOYMENT_MODE\}-network/\*${DEPLOYMENT_MODE}-network/g" \
            -e "s/\*swarm-ports/\*${DEPLOYMENT_MODE}-ports/g" \
            -e "s/\*swarm-deploy/\*${DEPLOYMENT_MODE}-deploy/g" \
            -e "s/\*swarm-network/\*${DEPLOYMENT_MODE}-network/g" \
            -e "s/\*proxy-ports/\*${DEPLOYMENT_MODE}-ports/g" \
            -e "s/\*proxy-deploy/\*${DEPLOYMENT_MODE}-deploy/g" \
            -e "s/\*proxy-network/\*${DEPLOYMENT_MODE}-network/g" \
            "$fragment_path" > "$temp_file"
    fi

    # Replace the original file
    mv "$temp_file" "$fragment_path"
    echo "  Rendered $fragment_file for $DEPLOYMENT_MODE mode"
done

echo "✓ All fragments rendered for $DEPLOYMENT_MODE mode"

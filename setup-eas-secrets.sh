#!/bin/bash

# Script to set EAS secrets from .env and .env.production files
# This script reads environment variables and sets them as EAS secrets

set -e

echo "🔐 Setting up EAS secrets from .env files..."
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "📄 Reading .env file..."
    
    # Function to extract value from .env file
    extract_env_var() {
        local var_name=$1
        grep "^${var_name}=" .env | cut -d '=' -f2- | sed 's/^"//;s/"$//'
    }
    
    # Read variables from .env
    SUPABASE_URL=$(extract_env_var "EXPO_PUBLIC_SUPABASE_URL")
    SUPABASE_ANON_KEY=$(extract_env_var "EXPO_PUBLIC_SUPABASE_ANON_KEY")
    OPENAI_API_KEY=$(extract_env_var "EXPO_PUBLIC_OPENAI_API_KEY")
    
    echo "✅ Loaded variables from .env"
else
    echo "⚠️  .env file not found, trying .env.production..."
fi

# Check if .env.production exists and use it if .env doesn't have values
if [ -f .env.production ]; then
    echo "📄 Reading .env.production file..."
    
    # Function to extract value from .env.production file
    extract_prod_env_var() {
        local var_name=$1
        grep "^${var_name}=" .env.production | cut -d '=' -f2- | sed 's/^"//;s/"$//'
    }
    
    # Use .env.production values if .env values are empty
    if [ -z "$SUPABASE_URL" ]; then
        SUPABASE_URL=$(extract_prod_env_var "EXPO_PUBLIC_SUPABASE_URL")
    fi
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        SUPABASE_ANON_KEY=$(extract_prod_env_var "EXPO_PUBLIC_SUPABASE_ANON_KEY")
    fi
    if [ -z "$OPENAI_API_KEY" ]; then
        OPENAI_API_KEY=$(extract_prod_env_var "EXPO_PUBLIC_OPENAI_API_KEY")
    fi
    
    echo "✅ Loaded variables from .env.production"
fi

# Verify we have values
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ] || [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: Missing required environment variables!"
    echo "   Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_OPENAI_API_KEY"
    exit 1
fi

echo ""
echo "📦 Setting EAS secrets..."
echo ""

# Function to set or update an environment variable for a specific environment
set_env_var_for_env() {
    local env_name=$1
    local var_name=$2
    local var_value=$3
    
    echo "Setting $var_name for $env_name environment..."
    
    # EXPO_PUBLIC_* variables should use 'sensitive' visibility, not 'secret'
    # since they're compiled into the app bundle
    local visibility="secret"
    if [[ "$var_name" == EXPO_PUBLIC_* ]]; then
        visibility="sensitive"
    fi
    
    # Create the environment variable (--force will overwrite if it exists)
    eas env:create "$env_name" --name "$var_name" --value "$var_value" --visibility "$visibility" --scope project --force --non-interactive || {
        echo "  ❌ Failed to set $var_name for $env_name"
        return 1
    }
    echo "  ✅ Successfully set $var_name for $env_name"
}

echo ""
echo "📦 Setting environment variables for production and preview..."
echo ""

# Set environment variables for both production and preview
for env in production preview; do
    echo "🌍 Setting variables for $env environment:"
    
    # Set EXPO_PUBLIC_SUPABASE_URL
    set_env_var_for_env "$env" "EXPO_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
    
    # Set EXPO_PUBLIC_SUPABASE_ANON_KEY
    set_env_var_for_env "$env" "EXPO_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
    
    # Set EXPO_PUBLIC_OPENAI_API_KEY
    set_env_var_for_env "$env" "EXPO_PUBLIC_OPENAI_API_KEY" "$OPENAI_API_KEY"
    
    echo ""
done

echo "✅ All EAS environment variables have been set!"
echo ""
echo "📋 Verifying environment variables..."
echo ""
echo "Production:"
eas env:list production
echo ""
echo "Preview:"
eas env:list preview

echo ""
echo "🎉 Done! Your environment variables are now set as EAS secrets."


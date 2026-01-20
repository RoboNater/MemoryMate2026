#!/bin/bash
# Validate Expo + React Native + TypeScript Setup
# Run this script from the project root directory

set -e

echo "=========================================="
echo "Expo Starter App Setup Validation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

check_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

check_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# Check if we're in a project directory
if [ ! -f "package.json" ]; then
    check_fail "Not in a project directory (package.json not found)"
    exit 1
fi

echo "Checking project configuration..."
echo ""

# 1. Check package.json main entry
echo "1. Checking package.json entry point..."
if grep -q '"main": "expo-router/entry"' package.json 2>/dev/null; then
    check_pass "Entry point is 'expo-router/entry'"
else
    check_fail "Entry point should be 'expo-router/entry'"
fi

# 2. Check required dependencies
echo ""
echo "2. Checking required dependencies..."

DEPS=("expo" "expo-router" "react" "react-native" "nativewind")
for dep in "${DEPS[@]}"; do
    if grep -q "\"$dep\":" package.json 2>/dev/null; then
        check_pass "Dependency: $dep"
    else
        check_fail "Missing dependency: $dep"
    fi
done

# 3. Check optional dependencies
OPTIONAL_DEPS=("react-dom" "react-native-web" "zustand" "expo-sqlite")
for dep in "${OPTIONAL_DEPS[@]}"; do
    if grep -q "\"$dep\":" package.json 2>/dev/null; then
        check_pass "Optional dependency: $dep"
    else
        check_warn "Optional dependency not installed: $dep"
    fi
done

# 4. Check react/react-dom version match
echo ""
echo "3. Checking React version consistency..."
if [ -f "package.json" ]; then
    REACT_VER=$(node -e "try { console.log(require('./package.json').dependencies.react || ''); } catch(e) { console.log(''); }")
    REACT_DOM_VER=$(node -e "try { console.log(require('./package.json').dependencies['react-dom'] || ''); } catch(e) { console.log(''); }")

    if [ -n "$REACT_DOM_VER" ]; then
        # Remove ^ or ~ prefixes for comparison
        REACT_CLEAN=$(echo "$REACT_VER" | sed 's/^[\^~]//')
        REACT_DOM_CLEAN=$(echo "$REACT_DOM_VER" | sed 's/^[\^~]//')

        if [ "$REACT_CLEAN" = "$REACT_DOM_CLEAN" ]; then
            check_pass "react ($REACT_VER) and react-dom ($REACT_DOM_VER) versions match"
        else
            check_warn "react ($REACT_VER) and react-dom ($REACT_DOM_VER) versions may not match"
        fi
    else
        check_warn "react-dom not installed (needed for web)"
    fi
fi

# 5. Check app.json configuration
echo ""
echo "4. Checking app.json configuration..."
if [ -f "app.json" ]; then
    if grep -q '"bundler": "metro"' app.json 2>/dev/null; then
        check_pass "Web bundler set to 'metro'"
    else
        check_warn "Web bundler not configured (needed for web)"
    fi

    if grep -q '"expo-router"' app.json 2>/dev/null; then
        check_pass "expo-router plugin configured"
    else
        check_fail "expo-router plugin missing from app.json"
    fi
else
    check_fail "app.json not found"
fi

# 6. Check configuration files
echo ""
echo "5. Checking configuration files..."

CONFIG_FILES=("tailwind.config.js" "babel.config.js" "metro.config.js" "global.css" "tsconfig.json")
for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "File exists: $file"
    else
        check_fail "Missing file: $file"
    fi
done

# Check nativewind-env.d.ts (optional but recommended)
if [ -f "nativewind-env.d.ts" ]; then
    check_pass "File exists: nativewind-env.d.ts"
else
    check_warn "Missing file: nativewind-env.d.ts (TypeScript NativeWind support)"
fi

# 7. Check NativeWind preset in tailwind.config.js
echo ""
echo "6. Checking NativeWind configuration..."
if [ -f "tailwind.config.js" ]; then
    if grep -q 'nativewind/preset' tailwind.config.js 2>/dev/null; then
        check_pass "NativeWind preset configured in tailwind.config.js"
    else
        check_fail "NativeWind preset missing in tailwind.config.js"
    fi
fi

# 8. Check project structure
echo ""
echo "7. Checking project structure..."

# Check for src/app directory
if [ -d "src/app" ]; then
    check_pass "Directory exists: src/app/"

    if [ -f "src/app/_layout.tsx" ]; then
        check_pass "Root layout: src/app/_layout.tsx"
    else
        check_fail "Missing: src/app/_layout.tsx"
    fi

    if [ -f "src/app/index.tsx" ]; then
        check_pass "Index page: src/app/index.tsx"
    else
        check_fail "Missing: src/app/index.tsx"
    fi
elif [ -d "app" ]; then
    check_warn "Using app/ instead of src/app/ (src/app/ recommended)"
else
    check_fail "No app directory found (need src/app/ or app/)"
fi

# Check for duplicate app directories
if [ -d "src/app" ] && [ -d "app" ]; then
    check_warn "Both src/app/ and app/ exist - may cause routing confusion"
fi

# 9. Check global.css import in layout
echo ""
echo "8. Checking global.css import..."
LAYOUT_FILE=""
if [ -f "src/app/_layout.tsx" ]; then
    LAYOUT_FILE="src/app/_layout.tsx"
elif [ -f "app/_layout.tsx" ]; then
    LAYOUT_FILE="app/_layout.tsx"
fi

if [ -n "$LAYOUT_FILE" ]; then
    if grep -q "global.css" "$LAYOUT_FILE" 2>/dev/null; then
        check_pass "global.css imported in $LAYOUT_FILE"
    else
        check_fail "global.css not imported in $LAYOUT_FILE"
    fi
fi

# Summary
echo ""
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Your project is configured correctly."
    echo "Run 'npx expo start' to start the development server."
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}Passed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Your project should work but consider addressing the warnings."
else
    echo -e "${RED}Failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors before running the app."
fi

echo ""
exit $ERRORS

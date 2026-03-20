#!/bin/bash

# Build locally with custom naming and output to builds/ directory
# Output format: arrout_v{version}_{YYYY_MM_DD}_{platform}.{ext}
#
# Usage:
#   ./scripts/build-local.sh android          # Android APK (preview profile)
#   ./scripts/build-local.sh android prod      # Android AAB (production profile)
#   ./scripts/build-local.sh ios              # iOS (preview profile)
#   ./scripts/build-local.sh ios prod          # iOS (production profile)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILDS_DIR="$PROJECT_ROOT/builds"

PLATFORM="${1:-android}"
PROFILE="${2:-preview}"

if [[ "$PLATFORM" != "android" && "$PLATFORM" != "ios" ]]; then
  echo "Usage: $0 <android|ios> [preview|production]"
  exit 1
fi

if [[ "$PROFILE" == "prod" ]]; then
  PROFILE="production"
fi

mkdir -p "$BUILDS_DIR"

VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")
DATE_STR=$(date +"%Y_%m_%d")

if [[ "$PLATFORM" == "android" ]]; then
  if [[ "$PROFILE" == "preview" ]]; then
    EXT="apk"
  else
    EXT="aab"
  fi
  BUILD_NAME="arrout_v${VERSION}_${DATE_STR}_android_${PROFILE}.${EXT}"
else
  EXT="tar.gz"
  BUILD_NAME="arrout_v${VERSION}_${DATE_STR}_ios_${PROFILE}.${EXT}"
fi

echo "==================================="
echo "  Arrout Local Build"
echo "==================================="
echo "  Platform: $PLATFORM"
echo "  Profile:  $PROFILE"
echo "  Version:  $VERSION"
echo "  Output:   builds/$BUILD_NAME"
echo "==================================="
echo ""

cd "$PROJECT_ROOT"
eas build --platform "$PLATFORM" --profile "$PROFILE" --local

# Find the most recently created build artifact
if [[ "$PLATFORM" == "android" ]]; then
  BUILT_FILE=$(ls -t "$PROJECT_ROOT"/build-*.${EXT} 2>/dev/null | head -1)
else
  BUILT_FILE=$(ls -t "$PROJECT_ROOT"/build-*.${EXT} 2>/dev/null | head -1)
  # iOS local builds can also produce .ipa
  if [ -z "$BUILT_FILE" ]; then
    BUILT_FILE=$(ls -t "$PROJECT_ROOT"/build-*.ipa 2>/dev/null | head -1)
    if [ -n "$BUILT_FILE" ]; then
      BUILD_NAME="${BUILD_NAME%.tar.gz}.ipa"
    fi
  fi
fi

if [ -z "$BUILT_FILE" ]; then
  echo ""
  echo "Warning: Could not find build artifact to rename."
  echo "Check the project root for the output file."
  exit 1
fi

mv "$BUILT_FILE" "$BUILDS_DIR/$BUILD_NAME"

echo ""
echo "==================================="
echo "  Build complete!"
echo "  Saved to: builds/$BUILD_NAME"
echo "==================================="

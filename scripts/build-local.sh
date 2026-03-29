#!/bin/bash

# Build locally with custom naming and output to builds/ directory
# Output format: arrout_v{version}_{YYYY_MM_DD}_{platform}.{ext}
#
# Usage:
#   ./scripts/build-local.sh android          # Android APK (preview profile)
#   ./scripts/build-local.sh android prod      # Android AAB (production profile)
#   ./scripts/build-local.sh ios              # iOS (preview profile)
#   ./scripts/build-local.sh ios prod          # iOS (production profile)
#   ./scripts/build-local.sh web              # Web static export (zipped)
#   ./scripts/build-local.sh web --no-zip     # Web static export (dist/ kept for local preview)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILDS_DIR="$PROJECT_ROOT/builds"

PLATFORM="${1:-android}"
PROFILE="${2:-preview}"
NO_ZIP=false

for arg in "$@"; do
  if [[ "$arg" == "--no-zip" ]]; then
    NO_ZIP=true
  fi
done

if [[ "$PLATFORM" != "android" && "$PLATFORM" != "ios" && "$PLATFORM" != "web" ]]; then
  echo "Usage: $0 <android|ios|web> [preview|production]"
  exit 1
fi

if [[ "$PROFILE" == "prod" ]]; then
  PROFILE="production"
fi

mkdir -p "$BUILDS_DIR"

VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")
DATE_STR=$(date +"%Y_%m_%d")

if [[ "$PLATFORM" == "web" ]]; then
  if [[ "$NO_ZIP" == true ]]; then
    BUILD_NAME="dist/"
  else
    BUILD_NAME="arrout_v${VERSION}_${DATE_STR}_web.zip"
  fi
elif [[ "$PLATFORM" == "android" ]]; then
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
if [[ "$PLATFORM" != "web" ]]; then
  echo "  Profile:  $PROFILE"
fi
echo "  Version:  $VERSION"
if [[ "$PLATFORM" == "web" && "$NO_ZIP" == true ]]; then
  echo "  Output:   dist/ (no zip)"
else
  echo "  Output:   builds/$BUILD_NAME"
fi
echo "==================================="
echo ""

cd "$PROJECT_ROOT"

if [[ "$PLATFORM" == "web" ]]; then
  npx expo export --platform web

  WEB_DIST="$PROJECT_ROOT/dist"
  if [ ! -d "$WEB_DIST" ]; then
    echo ""
    echo "Warning: Could not find dist/ directory after web export."
    exit 1
  fi

  if [[ "$NO_ZIP" == true ]]; then
    echo ""
    echo "dist/ kept for local preview. Run: npx serve dist"
  else
    (cd "$WEB_DIST" && zip -r "$BUILDS_DIR/$BUILD_NAME" .)
    rm -rf "$WEB_DIST"
  fi
else
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
fi

echo ""
echo "==================================="
echo "  Build complete!"
echo "  Saved to: builds/$BUILD_NAME"
echo "==================================="

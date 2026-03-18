#!/usr/bin/env bash
# =============================================================================
# FitAI — Build Both APKs (Dev + Preview) via local Gradle
# =============================================================================
# APK 1 — Development (debug)  : JS loaded from Metro at runtime → hot reload
# APK 2 — Preview   (release)  : JS bundle embedded → works fully offline
#
# Usage:
#   ./build-both-apks.sh            # build + install both
#   ./build-both-apks.sh --build-only   # build, skip install
#   ./build-both-apks.sh --dev-only     # only dev APK
#   ./build-both-apks.sh --preview-only # only preview APK
# =============================================================================

set -e

PROJECT_DIR="D:/FitAi/FitAI"
ANDROID_DIR="$PROJECT_DIR/android"
APK_DEBUG_DIR="$ANDROID_DIR/app/build/outputs/apk/debug"
APK_RELEASE_DIR="$ANDROID_DIR/app/build/outputs/apk/release"
ADB="C:/Users/Harsh/AppData/Local/Android/Sdk/platform-tools/adb"

BUILD_DEV=true
BUILD_PREVIEW=true
DO_INSTALL=true

# ── Parse args ────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --build-only)   DO_INSTALL=false ;;
    --dev-only)     BUILD_PREVIEW=false ;;
    --preview-only) BUILD_DEV=false ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
print_header() { echo; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; echo "  $1"; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }
ok()   { echo "  ✓ $*"; }
info() { echo "  → $*"; }
warn() { echo "  ⚠ $*"; }
fail() { echo "  ✗ $*"; exit 1; }

# Find best APK for physical device: prefer arm64, fall back to universal/x86_64
find_apk() {
  local dir="$1" suffix="$2"
  for candidate in \
    "$dir/app-arm64-v8a-${suffix}.apk" \
    "$dir/app-${suffix}.apk" \
    "$dir/app-x86_64-${suffix}.apk"; do
    [[ -f "$candidate" ]] && echo "$candidate" && return
  done
  echo ""
}

install_apk() {
  local apk="$1" label="$2"
  if [[ -z "$apk" ]]; then
    warn "No APK found for $label — skipping install"
    return
  fi
  info "Installing $label..."
  "$ADB" install -r "$apk" && ok "$label installed" || warn "$label install failed (check USB / allow install prompt)"
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
print_header "FitAI — Build Both APKs"
info "Project : $PROJECT_DIR"
info "Android : $ANDROID_DIR"
info "Dev APK : $BUILD_DEV   |   Preview APK: $BUILD_PREVIEW   |   Install: $DO_INSTALL"

[[ -d "$ANDROID_DIR" ]] || fail "Android directory not found. Run 'npx expo prebuild --platform android' first."
[[ -f "$ANDROID_DIR/gradlew" ]] || fail "gradlew not found in $ANDROID_DIR"

export ANDROID_HOME="C:/Users/Harsh/AppData/Local/Android/Sdk"
cd "$ANDROID_DIR"

# ── Build Dev (debug) ─────────────────────────────────────────────────────────
if $BUILD_DEV; then
  print_header "Step 1/2 — Build Development APK (debug + hot reload)"
  info "Running: ./gradlew assembleDebug"
  echo
  ./gradlew assembleDebug --daemon --parallel
  DEV_APK=$(find_apk "$APK_DEBUG_DIR" "debug")
  if [[ -n "$DEV_APK" ]]; then
    ok "Dev APK : $DEV_APK"
    cp "$DEV_APK" "$PROJECT_DIR/FitAI-Dev-latest.apk"
    ok "Copied  → FitAI-Dev-latest.apk"
  else
    warn "Debug APK not found after build"
  fi
fi

# ── Build Preview (release) ───────────────────────────────────────────────────
if $BUILD_PREVIEW; then
  print_header "Step 2/2 — Build Preview APK (release, offline)"
  info "Running: ./gradlew assembleRelease"
  echo
  ./gradlew assembleRelease --daemon --parallel
  PREVIEW_APK=$(find_apk "$APK_RELEASE_DIR" "release")
  if [[ -n "$PREVIEW_APK" ]]; then
    ok "Preview APK : $PREVIEW_APK"
    cp "$PREVIEW_APK" "$PROJECT_DIR/FitAI-Preview-latest.apk"
    ok "Copied      → FitAI-Preview-latest.apk"
  else
    warn "Release APK not found after build"
  fi
fi

# ── Install ───────────────────────────────────────────────────────────────────
if $DO_INSTALL; then
  print_header "Installing APKs via USB (ADB)"

  # Check device connected
  DEVICES=$("$ADB" devices 2>/dev/null | grep -v "List of devices" | grep "device$" || true)
  if [[ -z "$DEVICES" ]]; then
    warn "No device detected. Make sure:"
    warn "  1. USB debugging is enabled on your phone"
    warn "  2. Cable is plugged in and you tapped 'Allow' on phone"
    warn "  3. Try: adb devices"
    warn ""
    warn "APKs built successfully — install manually:"
    [[ -n "$DEV_APK" ]]     && warn "  Dev     → $PROJECT_DIR/FitAI-Dev-latest.apk"
    [[ -n "$PREVIEW_APK" ]] && warn "  Preview → $PROJECT_DIR/FitAI-Preview-latest.apk"
    exit 0
  fi

  ok "Device found: $DEVICES"
  echo

  $BUILD_DEV     && install_apk "$DEV_APK"     "FitAI Dev (debug)"
  $BUILD_PREVIEW && install_apk "$PREVIEW_APK" "FitAI Preview (release)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
print_header "Done"
if $BUILD_DEV; then
  ok "Dev APK    → FitAI-Dev-latest.apk"
  info "  Run 'npx expo start --dev-client' then open app to use hot reload"
fi
if $BUILD_PREVIEW; then
  ok "Preview APK → FitAI-Preview-latest.apk"
  info "  Standalone — no server needed, works offline"
fi
echo

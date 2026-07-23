import { Dimensions, PixelRatio, Platform } from "react-native";

// Base dimensions (iPhone 14 Pro as reference)
const baseWidth = 393;
const baseHeight = 852;

// SAFE: Lazy dimension calculation - only called when functions are used
const getDimensions = () => {
  try {
    let { width: screenWidth, height: screenHeight } =
      Dimensions.get("window");

    // WEB/TABLET RESPONSIVE GUARD: On desktop browsers the window can be
    // 1920px+ wide, which made widthScale = 1920/393 ≈ 4.9 — every rw()/rp()
    // call blew up ~4.9×, making the whole app giant + cramped (not
    // mobile-ready). Cap the effective design width at 480px so large screens
    // render at phone/tablet-app scale (~1.0-1.2×), not desktop-stretched.
    // The app is a mobile app rendered in a browser; it should look mobile.
    const isWeb = Platform.OS === "web";
    const isTablet = screenWidth >= 768;
    if (isWeb || isTablet) {
      // Constrain to a phone-like column width for scaling math. The actual
      // centered max-width container is applied in App.tsx; here we only clamp
      // the scale factor so tokens stay phone-sized on big screens.
      screenWidth = Math.min(screenWidth, 480);
      screenHeight = Math.min(screenHeight, 900);
    }

    const widthScale = screenWidth / baseWidth;
    const heightScale = screenHeight / baseHeight;
    const scale = Math.min(widthScale, heightScale);
    const fontScale = PixelRatio.getFontScale();

    return {
      screenWidth,
      screenHeight,
      widthScale,
      heightScale,
      scale,
      fontScale,
    };
  } catch (error) {
    // Fallback for when Dimensions is not available (during module loading)
    // Fallback when Dimensions is not available
    return {
      screenWidth: 393,
      screenHeight: 852,
      widthScale: 1,
      heightScale: 1,
      scale: 1,
      fontScale: 1,
    };
  }
};

/**
 * Responsive width - scales based on device width
 */
export const rw = (width: number): number => {
  const { widthScale } = getDimensions();
  return Math.round(width * widthScale);
};

/**
 * Responsive height - scales based on device height
 */
export const rh = (height: number): number => {
  const { heightScale } = getDimensions();
  return Math.round(height * heightScale);
};

/**
 * Responsive size - scales based on the smaller dimension
 * Use for elements that should maintain aspect ratio
 */
export const rs = (size: number): number => {
  const { scale } = getDimensions();
  return Math.round(size * scale);
};

/**
 * Responsive font size - scales with device and respects accessibility settings
 */
export const rf = (fontSize: number): number => {
  const { scale, fontScale } = getDimensions();
  const newSize = fontSize * scale;
  return Math.round(newSize / fontScale);
};

/**
 * Responsive padding/margin - scales based on width
 */
export const rp = (padding: number): number => {
  const { widthScale } = getDimensions();
  return Math.round(padding * widthScale);
};

/**
 * Get device info - SAFE: calculated on demand
 */
const getDeviceInfo = () => {
  const { screenWidth, screenHeight } = getDimensions();
  return {
    screenWidth,
    screenHeight,
    isSmallDevice: screenWidth < 375,
    isMediumDevice: screenWidth >= 375 && screenWidth < 414,
    isLargeDevice: screenWidth >= 414,
    isTablet: screenWidth >= 768,
    hasNotch: Platform.OS === "ios" && screenHeight >= 812,
    isAndroid: Platform.OS === "android",
    isIOS: Platform.OS === "ios",
  };
};

// For backwards compatibility - use lazy loading
export const deviceInfo = getDeviceInfo();

/**
 * Responsive border radius
 */
export const rbr = (radius: number): number => {
  const { scale } = getDimensions();
  return Math.round(radius * scale);
};

// Export dimensions for direct use - SAFE: calculated on demand
const getDimensions_Export = () => {
  const { screenWidth, screenHeight } = getDimensions();
  return {
    screenWidth,
    screenHeight,
    baseWidth,
    baseHeight,
  };
};

// For backwards compatibility
export const dimensions = getDimensions_Export();

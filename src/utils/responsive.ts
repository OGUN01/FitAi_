import { Dimensions, PixelRatio, Platform } from "react-native";

// Base dimensions (iPhone 14 Pro as reference)
const baseWidth = 393;
const baseHeight = 852;

// SAFE: Lazy dimension calculation - only called when functions are used
const getDimensions = () => {
  try {
    const { width: screenWidth, height: screenHeight } =
      Dimensions.get("window");
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

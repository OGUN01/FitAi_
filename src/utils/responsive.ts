import { Dimensions, PixelRatio, Platform } from 'react-native';

// Base dimensions (iPhone 14 Pro as reference)
const baseWidth = 393;
const baseHeight = 852;

// SAFE: Lazy dimension calculation - only called when functions are used
const getDimensions = () => {
  try {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
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
    console.warn('Dimensions not available, using fallback values:', error);
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
export const getDeviceInfo = () => {
  const { screenWidth, screenHeight } = getDimensions();
  return {
    screenWidth,
    screenHeight,
    isSmallDevice: screenWidth < 375,
    isMediumDevice: screenWidth >= 375 && screenWidth < 414,
    isLargeDevice: screenWidth >= 414,
    isTablet: screenWidth >= 768,
    hasNotch: Platform.OS === 'ios' && screenHeight >= 812,
    isAndroid: Platform.OS === 'android',
    isIOS: Platform.OS === 'ios',
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

/**
 * Get status bar height (for Android)
 */
export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'android') {
    return 0; // Will be handled by SafeAreaView
  }
  return 0;
};

/**
 * Get bottom tab bar height
 */
export const getTabBarHeight = (): number => {
  const deviceInfo = getDeviceInfo();
  if (deviceInfo.hasNotch) {
    return rh(80); // Higher for devices with notch
  }
  return rh(60);
};

/**
 * Responsive line height
 */
export const rlh = (fontSize: number, multiplier: number = 1.5): number => {
  return Math.round(rf(fontSize) * multiplier);
};

/**
 * Create responsive styles object
 */
export const createResponsiveStyles = <T extends Record<string, any>>(styles: T): T => {
  const responsiveStyles: any = {};

  for (const key in styles) {
    const style = styles[key];
    const responsiveStyle: any = {};

    for (const prop in style) {
      const value = style[prop];

      // Handle numeric values for specific properties
      if (typeof value === 'number') {
        switch (prop) {
          case 'fontSize':
            responsiveStyle[prop] = rf(value);
            break;
          case 'lineHeight':
            responsiveStyle[prop] = rlh(value);
            break;
          case 'width':
          case 'maxWidth':
          case 'minWidth':
            responsiveStyle[prop] = rw(value);
            break;
          case 'height':
          case 'maxHeight':
          case 'minHeight':
            responsiveStyle[prop] = rh(value);
            break;
          case 'padding':
          case 'paddingTop':
          case 'paddingBottom':
          case 'paddingLeft':
          case 'paddingRight':
          case 'paddingHorizontal':
          case 'paddingVertical':
          case 'margin':
          case 'marginTop':
          case 'marginBottom':
          case 'marginLeft':
          case 'marginRight':
          case 'marginHorizontal':
          case 'marginVertical':
            responsiveStyle[prop] = rp(value);
            break;
          case 'borderRadius':
          case 'borderTopLeftRadius':
          case 'borderTopRightRadius':
          case 'borderBottomLeftRadius':
          case 'borderBottomRightRadius':
            responsiveStyle[prop] = rbr(value);
            break;
          default:
            responsiveStyle[prop] = value;
        }
      } else {
        responsiveStyle[prop] = value;
      }
    }

    responsiveStyles[key] = responsiveStyle;
  }

  return responsiveStyles as T;
};

// Export dimensions for direct use - SAFE: calculated on demand
export const getDimensions_Export = () => {
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

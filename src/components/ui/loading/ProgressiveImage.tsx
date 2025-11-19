/**
 * Progressive Image Component
 * Implements blur-up technique for smooth image loading
 * Loads tiny blurred thumbnail first, then fades in full-resolution image
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  ImageStyle,
  ViewStyle,
  StyleProp,
  ImageSourcePropType,
  ImageResizeMode,
  Easing,
} from 'react-native';
import { AuroraSpinner } from './AuroraSpinner';

// ============================================================================
// TYPES
// ============================================================================

export interface ProgressiveImageProps {
  /**
   * Source of the full-resolution image
   */
  source: ImageSourcePropType;

  /**
   * Optional thumbnail source (low-res/blurred)
   * If not provided, uses the main source
   */
  thumbnailSource?: ImageSourcePropType;

  /**
   * Image resize mode
   */
  resizeMode?: ImageResizeMode;

  /**
   * Blur radius for thumbnail (default: 20)
   */
  thumbnailBlurRadius?: number;

  /**
   * Fade transition duration in ms (default: 400)
   */
  fadeDuration?: number;

  /**
   * Whether to show loading spinner
   */
  showSpinner?: boolean;

  /**
   * Custom style for the container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Custom style for the image
   */
  imageStyle?: StyleProp<ImageStyle>;

  /**
   * Callback when image loads successfully
   */
  onLoad?: () => void;

  /**
   * Callback when image fails to load
   */
  onError?: (error: any) => void;

  /**
   * Callback when loading starts
   */
  onLoadStart?: () => void;

  /**
   * Callback when loading ends (success or error)
   */
  onLoadEnd?: () => void;

  /**
   * Accessible label for the image
   */
  accessibilityLabel?: string;
}

// ============================================================================
// PROGRESSIVE IMAGE COMPONENT
// ============================================================================

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  thumbnailSource,
  resizeMode = 'cover',
  thumbnailBlurRadius = 20,
  fadeDuration = 400,
  showSpinner = true,
  style,
  imageStyle,
  onLoad,
  onError,
  onLoadStart,
  onLoadEnd,
  accessibilityLabel,
}) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const thumbnailOpacity = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

  // Fade in thumbnail when loaded
  useEffect(() => {
    if (thumbnailLoaded) {
      Animated.timing(thumbnailOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [thumbnailLoaded, thumbnailOpacity]);

  // Fade in full image and fade out thumbnail when loaded
  useEffect(() => {
    if (imageLoaded) {
      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: fadeDuration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(thumbnailOpacity, {
          toValue: 0,
          duration: fadeDuration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [imageLoaded, imageOpacity, thumbnailOpacity, fadeDuration]);

  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setIsLoading(false);
    onLoad?.();
  };

  const handleImageError = (error: any) => {
    setImageError(true);
    setIsLoading(false);
    onError?.(error);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  return (
    <View style={[styles.container, style]}>
      {/* Thumbnail layer (blurred) */}
      {!imageError && (
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: thumbnailOpacity,
            },
          ]}
        >
          <Image
            source={thumbnailSource || source}
            style={[styles.image, imageStyle]}
            resizeMode={resizeMode}
            blurRadius={thumbnailBlurRadius}
            onLoad={handleThumbnailLoad}
            accessibilityLabel={accessibilityLabel}
          />
        </Animated.View>
      )}

      {/* Full-resolution image layer */}
      {!imageError && (
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: imageOpacity,
            },
          ]}
        >
          <Image
            source={source}
            style={[styles.image, imageStyle]}
            resizeMode={resizeMode}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            accessibilityLabel={accessibilityLabel}
          />
        </Animated.View>
      )}

      {/* Loading spinner */}
      {showSpinner && isLoading && !imageError && (
        <View style={styles.spinnerContainer}>
          <AuroraSpinner size="sm" />
        </View>
      )}

      {/* Error placeholder */}
      {imageError && (
        <View style={[styles.errorContainer, imageStyle]}>
          <View style={styles.errorContent}>
            <Animated.Text style={styles.errorIcon}>⚠️</Animated.Text>
            <Animated.Text style={styles.errorText}>
              Failed to load image
            </Animated.Text>
          </View>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// PROGRESSIVE IMAGE BACKGROUND
// ============================================================================

export interface ProgressiveImageBackgroundProps
  extends ProgressiveImageProps {
  /**
   * Children to render over the background image
   */
  children?: React.ReactNode;
}

/**
 * Progressive Image as a background with children
 */
export const ProgressiveImageBackground: React.FC<
  ProgressiveImageBackgroundProps
> = ({ children, ...props }) => {
  return (
    <ProgressiveImage {...props}>
      <View style={styles.backgroundChildren}>{children}</View>
    </ProgressiveImage>
  );
};

// ============================================================================
// AVATAR WITH PROGRESSIVE LOADING
// ============================================================================

export interface ProgressiveAvatarProps {
  /**
   * Source of the avatar image
   */
  source: ImageSourcePropType;

  /**
   * Optional thumbnail source
   */
  thumbnailSource?: ImageSourcePropType;

  /**
   * Avatar size
   */
  size?: number;

  /**
   * Custom border radius (defaults to circular)
   */
  borderRadius?: number;

  /**
   * Border width
   */
  borderWidth?: number;

  /**
   * Border color
   */
  borderColor?: string;

  /**
   * Custom style
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Accessible label
   */
  accessibilityLabel?: string;
}

/**
 * Avatar component with progressive image loading
 */
export const ProgressiveAvatar: React.FC<ProgressiveAvatarProps> = ({
  source,
  thumbnailSource,
  size = 48,
  borderRadius,
  borderWidth = 0,
  borderColor = '#FFFFFF',
  style,
  accessibilityLabel,
}) => {
  const avatarBorderRadius = borderRadius !== undefined ? borderRadius : size / 2;

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: avatarBorderRadius,
          borderWidth,
          borderColor,
        },
        style,
      ]}
    >
      <ProgressiveImage
        source={source}
        thumbnailSource={thumbnailSource}
        resizeMode="cover"
        style={[
          styles.avatarImage,
          {
            width: size,
            height: size,
            borderRadius: avatarBorderRadius,
          },
        ]}
        showSpinner={true}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
};

// ============================================================================
// CACHED IMAGE WRAPPER
// ============================================================================

export interface CachedImageProps extends ProgressiveImageProps {
  /**
   * Cache key for the image
   */
  cacheKey?: string;
}

/**
 * Progressive image with caching support
 * Note: For full caching, consider using react-native-fast-image or expo-image
 */
export const CachedProgressiveImage: React.FC<CachedImageProps> = ({
  cacheKey,
  ...props
}) => {
  // Simple wrapper for now - can be extended with actual caching logic
  return <ProgressiveImage {...props} />;
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  spinnerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  errorContent: {
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  backgroundChildren: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarImage: {
    overflow: 'hidden',
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default ProgressiveImage;

export {
  ProgressiveImageBackground,
  ProgressiveAvatar,
  CachedProgressiveImage,
};

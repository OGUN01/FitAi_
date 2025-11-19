/**
 * Gesture Type Definitions
 * TypeScript types for gesture handlers and configurations
 */

import { SharedValue } from 'react-native-reanimated';
import { GestureType } from 'react-native-gesture-handler';

// ============================================================================
// GESTURE TYPES
// ============================================================================

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export type GestureState = 'idle' | 'active' | 'cancelled' | 'ended';

// ============================================================================
// SWIPE TYPES
// ============================================================================

export interface SwipeEvent {
  direction: SwipeDirection;
  velocity: number;
  distance: number;
}

export interface SwipeGestureConfig {
  threshold?: number;
  velocity?: number;
  direction?: SwipeDirection | SwipeDirection[];
  enabled?: boolean;
}

// ============================================================================
// PULL TO REFRESH TYPES
// ============================================================================

export interface PullToRefreshState {
  isRefreshing: boolean;
  pullDistance: number;
  progress: number; // 0-1
}

export interface PullToRefreshResult {
  gesture: GestureType;
  translateY: SharedValue<number>;
  isRefreshing: SharedValue<boolean>;
}

// ============================================================================
// DRAG TYPES
// ============================================================================

export interface DragPosition {
  x: number;
  y: number;
}

export interface DragEvent {
  startIndex: number;
  currentIndex: number;
  targetIndex: number;
  position: DragPosition;
}

export interface DragToReorderResult {
  gesture: GestureType;
  translateY: SharedValue<number>;
  isDragging: SharedValue<boolean>;
}

// ============================================================================
// PINCH TYPES
// ============================================================================

export interface PinchEvent {
  scale: number;
  focalX: number;
  focalY: number;
}

export interface PinchToZoomResult {
  gesture: GestureType;
  scale: SharedValue<number>;
  focalX: SharedValue<number>;
  focalY: SharedValue<number>;
  resetZoom: () => void;
}

// ============================================================================
// LONG PRESS TYPES
// ============================================================================

export interface LongPressEvent {
  x: number;
  y: number;
  timestamp: number;
}

// ============================================================================
// GESTURE HANDLER TYPES
// ============================================================================

export interface GestureHandlerCallbacks {
  onGestureStart?: () => void;
  onGestureUpdate?: (event: any) => void;
  onGestureEnd?: () => void;
  onGestureCancelled?: () => void;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  GestureType,
};

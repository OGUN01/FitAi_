/**
 * Swipeable Card Types
 * Extracted to break circular dependency between SwipeableCardStack, SwipeCard, and useSwipeableCardStack
 */

export interface SwipeableCard {
  id: string;
  title: string;
  description: string;
  iconName: string;
  gradient: string[];
  details?: string[];
}

export interface SwipeableCardStackProps {
  cards: SwipeableCard[];
  onSwipeLeft?: (card: SwipeableCard) => void;
  onSwipeRight?: (card: SwipeableCard) => void;
  onCardChange?: (index: number) => void;
}

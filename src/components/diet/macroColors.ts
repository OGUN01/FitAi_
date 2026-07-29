import { flatColors as colors } from '../../theme/aurora-tokens';

export interface MacroVisual {
  label: string;
  dotColor: string;
}

export const MACRO_VISUALS: Record<'protein' | 'carbs' | 'fat' | 'fiber', MacroVisual> = {
  protein: { label: 'Protein', dotColor: colors.blue },
  carbs: { label: 'Carbs', dotColor: colors.amberBright },
  fat: { label: 'Fats', dotColor: colors.successBright },
  fiber: { label: 'Fiber', dotColor: colors.purple },
};

export const MACRO_PILL_COLORS = {
  protein: colors.blue,
  carbs: colors.amberBright,
  fat: colors.successBright,
  fiber: colors.purple,
} as const;

export const OVERFLOW_COLOR = colors.error;

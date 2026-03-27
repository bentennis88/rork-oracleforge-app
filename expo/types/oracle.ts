export type OracleCategory = 
  | 'decision'
  | 'prediction'
  | 'habit'
  | 'creativity'
  | 'wellness'
  | 'productivity';

export interface OracleOption {
  id: string;
  label: string;
  value: string;
}

export interface Oracle {
  id: string;
  name: string;
  description: string;
  category: OracleCategory;
  prompt: string;
  icon: string;
  /**
   * Full Grok-generated oracle schema (inputs/components + result).
   * Stored in Firestore for rendering the oracle interactively later.
   */
  oracleJson?: any;
  options?: OracleOption[];
  createdAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  isFavorite: boolean;
}

export interface OracleResult {
  id: string;
  oracleId: string;
  input: string;
  output: string;
  createdAt: Date;
}

export interface UserSettings {
  darkMode: boolean;
  hapticFeedback: boolean;
  notifications: boolean;
  userName: string;
}

export const categoryColors: Record<OracleCategory, string> = {
  decision: 'cardDecision',
  prediction: 'cardPrediction',
  habit: 'cardHabit',
  creativity: 'cardCreativity',
  wellness: 'cardWellness',
  productivity: 'cardProductivity',
};

export const categoryIcons: Record<OracleCategory, string> = {
  decision: 'Scale',
  prediction: 'Sparkles',
  habit: 'Target',
  creativity: 'Lightbulb',
  wellness: 'Heart',
  productivity: 'Zap',
};

export const categoryLabels: Record<OracleCategory, string> = {
  decision: 'Decision',
  prediction: 'Prediction',
  habit: 'Habit',
  creativity: 'Creativity',
  wellness: 'Wellness',
  productivity: 'Productivity',
};

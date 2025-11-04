// Map task icon names to emoji
export const TASK_ICON_MAP: Record<string, string> = {
  // Physical
  Dumbbell: '🏋️',
  Run: '🏃',
  Walk: '🚶',
  Stretch: '🧘',
  Yoga: '🧘‍♀️',
  Bike: '🚴',
  Swim: '🏊',
  
  // Mental
  Brain: '🧠',
  BookOpen: '📖',
  
  // Spiritual
  BookHeart: '📖',
  HandHeart: '🙏',
  Music: '🎵',
  
  // Habits
  Droplet: '💧',
  Bed: '🛏️',
  Utensils: '🍽️',
};

export function getTaskIcon(iconName: string | null | undefined): string {
  if (!iconName) return '📌';
  return TASK_ICON_MAP[iconName] || iconName || '📌';
}


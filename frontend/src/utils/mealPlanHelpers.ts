
import { addDays, startOfWeek, format, isToday, isSameDay, parseISO } from 'date-fns';

export interface MealPlan {
  id: string;
  plannedFor: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  recipe?: {
    id: string;
    title: string;
    description?: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    difficulty: string;
    tags?: string[];
  };
}

export const getWeekDays = (date: Date): Date[] => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const getMealPlansForDay = (day: Date, mealPlans: MealPlan[]): MealPlan[] => {
  return mealPlans.filter(plan => 
    isSameDay(parseISO(plan.plannedFor), day)
  );
};

export const formatMealPlanDate = (date: Date): string => {
  if (isToday(date)) {
    return 'Today';
  }
  return format(date, 'MMM d');
};

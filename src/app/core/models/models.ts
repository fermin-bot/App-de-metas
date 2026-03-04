export interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline?: string; // ISO date string
  completed: boolean;
  category: string;
  progress: number; // 0-100
  // Recurring/Habit fields
  type?: 'simple' | 'recurring';
  
  // Legacy fields (to be deprecated or mapped)
  frequency?: 'daily' | 'weekly' | 'specific_days'; 
  targetCount?: number; 
  selectedDays?: number[]; 
  duration?: number; // in days

  // New Recurring Fields (V2)
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceInterval?: number; // Every X [days/weeks/months/years]
  recurrenceDays?: number[]; // Specific days of week [0-6] for weekly recurrence
  
  durationValue?: number;
  durationUnit?: 'days' | 'weeks' | 'months' | 'years';
  
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string (calculated)
  history?: Record<string, boolean>; // 'YYYY-MM-DD': true
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: 'daily' | 'monthly' | 'annual';
  date?: string; // ISO date string for daily
  month?: number; // 0-11 for monthly
  year?: number; // YYYY for annual
  createdAt: string;
}

export interface Idea {
  id: string;
  content: string;
  createdAt: string;
}

export interface RoutineItem {
  id: string;
  time: string; // HH:mm
  activity: string;
  completed: boolean; // Reset daily
}

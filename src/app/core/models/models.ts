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
  
  // New Recurrence Logic for Tasks
  isRecurring: boolean;
  
  // Advanced Recurrence Config
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  // Monthly/Yearly Specifics
  // "First Saturday of Month" -> monthType='weekday', monthWeek=1, monthWeekday=6
  // "15th of Month" -> monthType='date', monthDay=15
  recurrenceMonthType?: 'date' | 'weekday'; 
  recurrenceMonthDay?: number; // 1-31
  recurrenceWeekIndex?: number; // 1=First, 2=Second, 3=Third, 4=Fourth, 5=Last
  recurrenceDayOfWeek?: number; // 0=Sunday, 1=Monday...

  recurrenceAnnualMonth?: number; // 0-11
  recurrenceAnnualDay?: number; // 1-31

  recurrenceDate?: string; // Specific date for annual or one-off
  
  history?: Record<string, boolean>; // YYYY-MM-DD: true (for recurring)
  createdAt: string;
}

export interface Idea {
  id: string;
  content: string;
  createdAt: string;
  targetDate?: string; // YYYY-MM-DD
  status: 'apunte' | 'en_proceso' | 'desarrollada';
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // In a real app, this would be hashed or not stored locally like this
  createdAt: string;
  settings?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
}

export interface RoutineItem {
  id: string;
  time: string; // HH:mm
  activity: string;
  completed: boolean; // Reset daily
}

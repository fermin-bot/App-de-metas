import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { Goal, Task } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  private dataService = inject(DataService);

  today = new Date();
  todayStr = this.today.toISOString().split('T')[0];
  currentDayIndex = this.today.getDay(); // 0=Sun, 1=Mon...

  // Tasks statistics
  dailyTasks$ = this.dataService.getTasks().pipe(
    map(tasks => tasks.filter(t => t.type === 'daily' && t.recurrenceDate === this.todayStr))
  );

  // New: All Tasks for Today (One-off + Recurring)
  todaysTasks$ = this.dataService.getTasks().pipe(
    map(tasks => tasks.filter(t => {
      // 1. One-off Daily Tasks for today
      if (t.type === 'daily' && !t.isRecurring) {
        return t.recurrenceDate === this.todayStr; // Only show if date matches exactly
      }

      // 2. Recurring Tasks
      if (t.isRecurring) {
        const today = new Date();
        const d = today.getDate();
        const m = today.getMonth(); // 0-11
        const y = today.getFullYear();
        const dayOfWeek = today.getDay(); // 0=Sun

        // Check if completed today (to hide or show as checked?)
        // User probably wants to see them to check them off.
        
        if (t.type === 'daily') return true;

        if (t.type === 'monthly') {
          if (t.recurrenceMonthType === 'date') {
            return d === t.recurrenceMonthDay;
          } else if (t.recurrenceMonthType === 'weekday') {
            if (dayOfWeek !== t.recurrenceDayOfWeek) return false;
            
            const weekIdx = Math.ceil(d / 7);
            
            // Handle "Last" (5)
            if (t.recurrenceWeekIndex === 5) {
               const nextWeek = new Date(y, m, d + 7);
               return nextWeek.getMonth() !== m;
            }
            
            return weekIdx === t.recurrenceWeekIndex;
          }
        }

        if (t.type === 'annual') {
           // Check against recurrenceDate (if set for annual date)
           // Or use the new fields if I decide to use them.
           // Let's support both for robustness or just the new fields.
           // I added recurrenceAnnualMonth/Day to models.ts
           if (t.recurrenceAnnualMonth !== undefined && t.recurrenceAnnualDay !== undefined) {
             return m === t.recurrenceAnnualMonth && d === t.recurrenceAnnualDay;
           }
           // Fallback to recurrenceDate string parsing if needed
           if (t.recurrenceDate) {
             const parts = t.recurrenceDate.split('-');
             if (parts.length === 3) {
               return m === (parseInt(parts[1]) - 1) && d === parseInt(parts[2]);
             }
           }
        }
      }
      
      return false;
    }))
  );

  pendingTasksCount$ = this.todaysTasks$.pipe(
    map(tasks => tasks.filter(t => !this.isTaskCompletedToday(t)).length)
  );

  completedTasksCount$ = this.todaysTasks$.pipe(
    map(tasks => tasks.filter(t => this.isTaskCompletedToday(t)).length)
  );

  // Routine status
  routine$ = this.dataService.getRoutine().pipe(
    map(items => items.sort((a, b) => a.time.localeCompare(b.time)))
  );

  nextRoutineItem$ = this.routine$.pipe(
    map(items => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      return items.find(item => item.time > currentTime && !item.completed) || items.find(item => !item.completed);
    })
  );

  routineProgress$ = this.routine$.pipe(
    map(items => {
      if (items.length === 0) return 0;
      const completed = items.filter(i => i.completed).length;
      return Math.round((completed / items.length) * 100);
    })
  );

  // Goals snapshot
  activeGoals$ = this.dataService.getGoals().pipe(
    map(goals => goals.filter(g => !g.completed && g.type !== 'recurring').slice(0, 3))
  );

  // Recurring Habits for Today
  todaysHabits$ = this.dataService.getGoals().pipe(
    map(goals => goals.filter(g => {
      if (g.type !== 'recurring') return false;
      if (g.completed) return false;

      // New Recurrence Logic V2
      if (g.recurrenceType && g.startDate) {
        const start = new Date(g.startDate);
        const today = new Date(this.todayStr);
        
        // Check duration
        if (g.endDate && today > new Date(g.endDate)) return false;
        if (today < start) return false;

        const interval = g.recurrenceInterval || 1;

        if (g.recurrenceType === 'daily') {
           const diffTime = Math.abs(today.getTime() - start.getTime());
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
           return diffDays % interval === 0;
        }

        if (g.recurrenceType === 'weekly') {
           const diffTime = Math.abs(today.getTime() - start.getTime());
           const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
           
           if (diffWeeks % interval !== 0) return false;
           
           // Check specific days
           if (g.recurrenceDays && g.recurrenceDays.length > 0) {
             return g.recurrenceDays.includes(this.currentDayIndex);
           }
           return true; 
        }

        if (g.recurrenceType === 'monthly') {
           const diffMonths = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
           if (diffMonths % interval !== 0) return false;
           // Only show on same day of month
           return today.getDate() === start.getDate();
        }

        if (g.recurrenceType === 'yearly') {
           const diffYears = today.getFullYear() - start.getFullYear();
           if (diffYears % interval !== 0) return false;
           // Same day and month
           return today.getDate() === start.getDate() && today.getMonth() === start.getMonth();
        }
      }

      // Legacy Logic Fallback
      if (g.frequency === 'daily') return true;
      if (g.frequency === 'weekly') return true; 
      if (g.frequency === 'specific_days' && g.selectedDays) {
        return g.selectedDays.includes(this.currentDayIndex);
      }
      return false;
    }))
  );

  hasRecurringGoals$ = this.dataService.getGoals().pipe(
    map(goals => goals.some(g => g.type === 'recurring'))
  );

  isHabitCompletedToday(goal: Goal): boolean {
    return !!(goal.history && goal.history[this.todayStr]);
  }

  toggleHabit(goal: Goal) {
    this.dataService.toggleGoalCompletion(goal.id, this.todayStr);
  }

  // Task Helpers
  isTaskCompletedToday(task: Task): boolean {
    if (task.isRecurring) {
      return !!(task.history && task.history[this.todayStr]);
    }
    return task.completed;
  }

  toggleTask(task: Task) {
    if (task.isRecurring) {
      this.dataService.toggleTaskCompletion(task.id, this.todayStr);
    } else {
      // Toggle normal task
      // Need a method in DataService for this? 
      // Existing toggleTaskCompletion handles isRecurring check inside? 
      // Let's check data.ts
      this.dataService.toggleTaskCompletion(task.id, this.todayStr);
    }
  }
}

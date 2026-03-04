import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { Goal } from '../../core/models/models';

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
    map(tasks => tasks.filter(t => t.type === 'daily' && t.date === this.todayStr))
  );

  pendingTasksCount$ = this.dailyTasks$.pipe(
    map(tasks => tasks.filter(t => !t.completed).length)
  );

  completedTasksCount$ = this.dailyTasks$.pipe(
    map(tasks => tasks.filter(t => t.completed).length)
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
           return true; // If no specific days, maybe just once a week? Or every day of that week? Assuming every day if no days selected is risky.
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
}

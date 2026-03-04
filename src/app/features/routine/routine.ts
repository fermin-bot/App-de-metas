import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data';
import { RoutineItem, Goal, Task } from '../../core/models/models';
import { map } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';

interface UnifiedRoutineItem {
  id: string;
  type: 'routine' | 'goal' | 'task';
  title: string;
  time?: string; // HH:mm for routine
  completed: boolean;
  originalItem: RoutineItem | Goal | Task;
  displayTime: string; // "08:00" or "Todo el día"
  tag?: string; // "Meta", "Tarea", "Rutina"
}

@Component({
  selector: 'app-routine',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './routine.html',
  styleUrl: './routine.scss'
})
export class Routine {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);

  todayStr = new Date().toISOString().split('T')[0];
  currentDayIndex = new Date().getDay(); // 0=Sun

  unifiedRoutine$: Observable<UnifiedRoutineItem[]> = combineLatest([
    this.dataService.getRoutine(),
    this.dataService.getGoals(),
    this.dataService.getTasks()
  ]).pipe(
    map(([routineItems, goals, tasks]) => {
      const unified: UnifiedRoutineItem[] = [];

      // 1. Routine Items
      routineItems.forEach(item => {
        unified.push({
          id: item.id,
          type: 'routine',
          title: item.activity,
          time: item.time,
          completed: item.completed,
          originalItem: item,
          displayTime: item.time,
          tag: 'Rutina'
        });
      });

      // 2. Goals (Habits) for Today
      goals.forEach(g => {
        // Filter logic same as Dashboard
        let isForToday = false;
        
        if (g.type !== 'recurring') isForToday = false;
        else if (g.completed) isForToday = false; // Usually goals are hidden if completed? No, habits reset daily logic.
        // Wait, habits in goals list are "completed" if 100% progress?
        // Actually, for routine view we want to see if the *daily action* is done.
        
        // Recurrence Check V2
        else if (g.recurrenceType && g.startDate) {
          const start = new Date(g.startDate);
          const today = new Date(this.todayStr);
          if (g.endDate && today > new Date(g.endDate)) isForToday = false;
          else if (today < start) isForToday = false;
          else {
            const interval = g.recurrenceInterval || 1;
            if (g.recurrenceType === 'daily') {
              const diffTime = Math.abs(today.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
              isForToday = diffDays % interval === 0;
            } else if (g.recurrenceType === 'weekly') {
              const diffTime = Math.abs(today.getTime() - start.getTime());
              const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
              if (diffWeeks % interval !== 0) isForToday = false;
              else if (g.recurrenceDays && g.recurrenceDays.length > 0) {
                isForToday = g.recurrenceDays.includes(this.currentDayIndex);
              } else isForToday = true;
            } else if (g.recurrenceType === 'monthly') {
               const diffMonths = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
               if (diffMonths % interval !== 0) isForToday = false;
               else isForToday = today.getDate() === start.getDate();
            } else if (g.recurrenceType === 'yearly') {
               const diffYears = today.getFullYear() - start.getFullYear();
               if (diffYears % interval !== 0) isForToday = false;
               else isForToday = today.getDate() === start.getDate() && today.getMonth() === start.getMonth();
            }
          }
        } 
        // Legacy Logic
        else {
          if (g.frequency === 'daily') isForToday = true;
          else if (g.frequency === 'weekly') isForToday = true;
          else if (g.frequency === 'specific_days' && g.selectedDays) {
            isForToday = g.selectedDays.includes(this.currentDayIndex);
          }
        }

        if (isForToday) {
          const isCompletedToday = !!(g.history && g.history[this.todayStr]);
          unified.push({
            id: g.id,
            type: 'goal',
            title: g.title,
            completed: isCompletedToday,
            originalItem: g,
            displayTime: 'Todo el día',
            tag: 'Hábito'
          });
        }
      });

      // 3. Tasks for Today
      tasks.forEach(t => {
        let isForToday = false;
        
        // One-off
        if (t.type === 'daily' && !t.isRecurring) {
          isForToday = t.recurrenceDate === this.todayStr;
        }
        // Recurring
        else if (t.isRecurring) {
           const today = new Date();
           const d = today.getDate();
           const m = today.getMonth();
           const y = today.getFullYear();
           const dayOfWeek = today.getDay();

           if (t.type === 'daily') isForToday = true;
           else if (t.type === 'monthly') {
             if (t.recurrenceMonthType === 'date') {
               isForToday = d === t.recurrenceMonthDay;
             } else if (t.recurrenceMonthType === 'weekday') {
               if (dayOfWeek === t.recurrenceDayOfWeek) {
                  const weekIdx = Math.ceil(d / 7);
                  if (t.recurrenceWeekIndex === 5) {
                    const nextWeek = new Date(y, m, d + 7);
                    isForToday = nextWeek.getMonth() !== m;
                  } else {
                    isForToday = weekIdx === t.recurrenceWeekIndex;
                  }
               }
             }
           } else if (t.type === 'annual') {
              if (t.recurrenceAnnualMonth !== undefined && t.recurrenceAnnualDay !== undefined) {
                isForToday = m === t.recurrenceAnnualMonth && d === t.recurrenceAnnualDay;
              } else if (t.recurrenceDate) {
                const parts = t.recurrenceDate.split('-');
                if (parts.length === 3) {
                  isForToday = m === (parseInt(parts[1]) - 1) && d === parseInt(parts[2]);
                }
              }
           }
        }

        if (isForToday) {
          let isCompleted = t.completed;
          if (t.isRecurring) {
            isCompleted = !!(t.history && t.history[this.todayStr]);
          }

          unified.push({
            id: t.id,
            type: 'task',
            title: t.title,
            completed: isCompleted,
            originalItem: t,
            displayTime: 'Todo el día',
            tag: 'Tarea'
          });
        }
      });

      // Sort: Time-based items first (sorted by time), then others
      return unified.sort((a, b) => {
        if (a.type === 'routine' && b.type === 'routine') {
          return (a.time || '').localeCompare(b.time || '');
        }
        if (a.type === 'routine') return -1;
        if (b.type === 'routine') return 1;
        return 0; // Keep order for others
      });
    })
  );
  
  showForm = false;

  routineForm = this.fb.group({
    time: ['', Validators.required],
    activity: ['', Validators.required]
  });

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.routineForm.reset();
  }

  addRoutineItem() {
    if (this.routineForm.valid) {
      this.dataService.addRoutineItem({
        time: this.routineForm.value.time!,
        activity: this.routineForm.value.activity!,
        completed: false
      });
      this.toggleForm();
    }
  }

  toggleItem(item: UnifiedRoutineItem) {
    if (item.type === 'routine') {
      this.dataService.toggleRoutineItem(item.id);
    } else if (item.type === 'goal') {
      this.dataService.toggleGoalCompletion(item.id, this.todayStr);
    } else if (item.type === 'task') {
      this.dataService.toggleTaskCompletion(item.id, this.todayStr);
    }
  }

  deleteRoutineItem(id: string) {
    if (confirm('¿Eliminar esta actividad?')) {
      this.dataService.deleteRoutineItem(id);
    }
  }

  // Only allow deleting routine items directly from here
  canDelete(item: UnifiedRoutineItem): boolean {
    return item.type === 'routine';
  }

  resetDaily() {
    if (confirm('¿Reiniciar rutina para un nuevo día?')) {
      this.dataService.resetDailyRoutine();
    }
  }
}

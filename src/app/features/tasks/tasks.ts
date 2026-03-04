import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data';
import { Task } from '../../core/models/models';
import { map } from 'rxjs/operators';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss'
})
export class Tasks {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);

  selectedType$ = new BehaviorSubject<'daily' | 'monthly' | 'annual'>('daily');
  showForm = false;
  
  todayStr = new Date().toISOString().split('T')[0];

  taskForm = this.fb.group({
    title: ['', Validators.required],
    type: ['daily' as 'daily' | 'monthly' | 'annual', Validators.required],
    
    // Recurrence Fields
    isRecurring: [true], // Default to recurring for "Tasks" in this new context? User said "Tasks must be repetitive"
    
    // Daily Config
    recurrenceDate: [new Date().toISOString().split('T')[0]], // For one-off daily
    
    // Monthly Config
    recurrenceMonthType: ['date' as 'date' | 'weekday'], // 'date' (15th) or 'weekday' (1st Sat)
    recurrenceMonthDay: [1, [Validators.min(1), Validators.max(31)]],
    recurrenceWeekIndex: [1], // 1=First, 2=Second... 5=Last
    recurrenceDayOfWeek: [6], // 6=Saturday
    
    // Annual Config
    recurrenceAnnualMonth: [0], // 0=Jan
    recurrenceAnnualDay: [1]
  });

  tasks$: Observable<Task[]> = combineLatest([
    this.dataService.getTasks(),
    this.selectedType$
  ]).pipe(
    map(([tasks, type]) => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      return tasks.filter(task => {
        if (task.type !== type) return false;
        
        // Show all recurring tasks for configuration? 
        // Or show only tasks relevant for "Today/This Month/This Year"?
        // User said: "like goals that come out... e.g. every month on Saturday..."
        // In the list view, we probably want to see the *definitions* of tasks, 
        // and maybe their status for the current period.
        
        // For simplicity in the management view, let's show all tasks of the selected type.
        // We will calculate "completed" status dynamically based on history if recurring.
        
        if (task.isRecurring) {
           return true;
        }

        // Legacy non-recurring logic (if any)
        if (type === 'daily') {
          return task.recurrenceDate === todayStr;
        }
        return true;
      }).map(task => {
        // Calculate dynamic completed state for display
        if (task.isRecurring && task.history) {
           // For daily: check today
           if (task.type === 'daily') {
             task.completed = !!task.history[todayStr];
           }
           // For monthly: check this month (key format YYYY-MM)
           else if (task.type === 'monthly') {
             const key = `${now.getFullYear()}-${now.getMonth()}`; 
             // We need a standard key for monthly completion. 
             // Let's use the first day of the month or just YYYY-MM string?
             // History is Record<string, boolean>. Let's use YYYY-MM-01 for monthly tasks
             const monthKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-01`;
             // Wait, history usually stores specific completion dates.
             // If I completed it on 2024-03-05, it stores '2024-03-05': true.
             
             // So to check if completed "this month", we check if ANY date in this month is in history?
             // Or we force the key to be the "due date"?
             
             // Let's find the "Due Date" for this month to check status.
             const dueDate = this.calculateNextDueDate(task, now);
             if (dueDate) {
                const dueStr = dueDate.toISOString().split('T')[0];
                task.completed = !!task.history[dueStr];
             }
           }
           // For annual
           else if (task.type === 'annual') {
             const dueDate = this.calculateNextDueDate(task, now);
             if (dueDate) {
                const dueStr = dueDate.toISOString().split('T')[0];
                task.completed = !!task.history[dueStr];
             }
           }
        }
        return task;
      });
    })
  );

  weekDays = [
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
    { id: 0, name: 'Domingo' }
  ];

  months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  weekIndices = [
    { id: 1, name: 'Primer' },
    { id: 2, name: 'Segundo' },
    { id: 3, name: 'Tercer' },
    { id: 4, name: 'Cuarto' },
    { id: 5, name: 'Último' }
  ];

  constructor() {
    this.selectedType$.subscribe(type => {
      this.taskForm.patchValue({ type });
    });
  }

  setType(type: 'daily' | 'monthly' | 'annual') {
    this.selectedType$.next(type);
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.taskForm.reset({
        type: this.selectedType$.value,
        isRecurring: true,
        recurrenceDate: new Date().toISOString().split('T')[0],
        recurrenceMonthType: 'weekday',
        recurrenceMonthDay: 1,
        recurrenceWeekIndex: 1,
        recurrenceDayOfWeek: 6,
        recurrenceAnnualMonth: 0,
        recurrenceAnnualDay: 1
      });
    }
  }

  addTask() {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      
      const newTask: any = {
        title: formValue.title!,
        completed: false,
        type: formValue.type as 'daily' | 'monthly' | 'annual',
        isRecurring: formValue.isRecurring !== false, // Default true
        createdAt: new Date().toISOString()
      };

      if (newTask.type === 'daily') {
        newTask.recurrenceType = 'daily';
        if (!newTask.isRecurring) {
          newTask.recurrenceDate = formValue.recurrenceDate;
        }
      } else if (newTask.type === 'monthly') {
        newTask.recurrenceType = 'monthly';
        newTask.recurrenceMonthType = formValue.recurrenceMonthType;
        if (formValue.recurrenceMonthType === 'date') {
          newTask.recurrenceMonthDay = formValue.recurrenceMonthDay;
        } else {
          newTask.recurrenceWeekIndex = formValue.recurrenceWeekIndex;
          newTask.recurrenceDayOfWeek = formValue.recurrenceDayOfWeek;
        }
      } else if (newTask.type === 'annual') {
        newTask.recurrenceType = 'yearly';
        newTask.recurrenceAnnualMonth = formValue.recurrenceAnnualMonth;
        newTask.recurrenceAnnualDay = formValue.recurrenceAnnualDay;
        // Also keep recurrenceDate for backward compatibility or easy sorting
        newTask.recurrenceDate = `0000-${(formValue.recurrenceAnnualMonth! + 1).toString().padStart(2, '0')}-${formValue.recurrenceAnnualDay!.toString().padStart(2, '0')}`;
      }

      this.dataService.addTask(newTask);
      this.toggleForm();
    }
  }

  toggleTask(task: Task) {
    // Determine the "date" key for history
    const now = new Date();
    let dateKey = now.toISOString().split('T')[0];

    if (task.type === 'monthly' || task.type === 'annual') {
       const dueDate = this.calculateNextDueDate(task, now);
       if (dueDate) {
         dateKey = dueDate.toISOString().split('T')[0];
       }
    }

    this.dataService.toggleTaskCompletion(task.id, dateKey);
  }

  deleteTask(id: string, event?: Event) {
    if (event) event.stopPropagation();
    if(confirm('¿Eliminar tarea?')) {
      this.dataService.deleteTask(id);
    }
  }

  // Helper to find when this task is due in the given context (month/year)
  private calculateNextDueDate(task: Task, contextDate: Date): Date | null {
    const year = contextDate.getFullYear();
    const month = contextDate.getMonth();

    if (task.type === 'daily') return contextDate;

    if (task.type === 'monthly') {
      if (task.recurrenceMonthType === 'date') {
        // e.g. 15th
        const day = task.recurrenceMonthDay || 1;
        return new Date(year, month, day);
      } else {
        // e.g. 1st Saturday
        const weekIdx = task.recurrenceWeekIndex || 1; // 1-5
        const dayOfWeek = task.recurrenceDayOfWeek || 0; // 0=Sun
        
        const firstDayOfMonth = new Date(year, month, 1);
        let date = new Date(firstDayOfMonth);
        
        // Find first occurrence of dayOfWeek
        while (date.getDay() !== dayOfWeek) {
          date.setDate(date.getDate() + 1);
        }

        // Add weeks
        if (weekIdx > 1) {
          date.setDate(date.getDate() + (weekIdx - 1) * 7);
        }
        
        // Check if we overflowed month (e.g. 5th Friday might not exist)
        if (date.getMonth() !== month) {
           // Handle "Last" logic if weekIdx was 5? 
           // For now return null or the date in next month?
           return null; 
        }
        return date;
      }
    }

    if (task.type === 'annual') {
       if (task.recurrenceAnnualMonth !== undefined && task.recurrenceAnnualDay !== undefined) {
          return new Date(year, task.recurrenceAnnualMonth, task.recurrenceAnnualDay);
       }
       
       if (task.recurrenceDate && task.recurrenceDate.startsWith('0000-')) {
          const parts = task.recurrenceDate.split('-');
          const m = parseInt(parts[1]) - 1;
          const d = parseInt(parts[2]);
          return new Date(year, m, d);
       }
    }

    return null;
  }
  
  getTaskDescription(task: Task): string {
    if (task.type === 'daily') return 'Todos los días';
    
    if (task.type === 'monthly') {
      if (task.recurrenceMonthType === 'date') {
        return `El día ${task.recurrenceMonthDay} de cada mes`;
      } else {
        const weekMap: any = {1:'Primer', 2:'Segundo', 3:'Tercer', 4:'Cuarto', 5:'Último'};
        const dayMap: any = {0:'Domingo', 1:'Lunes', 2:'Martes', 3:'Miércoles', 4:'Jueves', 5:'Viernes', 6:'Sábado'};
        return `${weekMap[task.recurrenceWeekIndex || 1]} ${dayMap[task.recurrenceDayOfWeek || 0]} del mes`;
      }
    }
    
    if (task.type === 'annual') {
       if (task.recurrenceAnnualMonth !== undefined && task.recurrenceAnnualDay !== undefined) {
          return `Cada ${task.recurrenceAnnualDay} de ${this.months[task.recurrenceAnnualMonth]}`;
       }
       if (task.recurrenceDate) {
         const parts = task.recurrenceDate.split('-');
         const m = parseInt(parts[1]) - 1;
         const d = parseInt(parts[2]);
         return `Cada ${d} de ${this.months[m]}`;
       }
    }
    
    return '';
  }
}

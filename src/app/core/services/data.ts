import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Goal, Task, Idea, RoutineItem } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private goals$ = new BehaviorSubject<Goal[]>(this.load('goals') || []);
  private tasks$ = new BehaviorSubject<Task[]>(this.load('tasks') || []);
  private ideas$ = new BehaviorSubject<Idea[]>(this.load('ideas') || []);
  private routine$ = new BehaviorSubject<RoutineItem[]>(this.load('routine') || []);

  private load(key: string): any {
    if (this.isBrowser) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  private save(key: string, data: any) {
    if (this.isBrowser) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  // Goals
  getGoals() { return this.goals$.asObservable(); }

  addGoal(goal: Omit<Goal, 'id'>) {
    const newGoal: Goal = { 
      ...goal, 
      id: crypto.randomUUID(),
      history: goal.type === 'recurring' ? {} : undefined 
    };

    // Calculate endDate if V2 fields are present
    if (newGoal.type === 'recurring' && newGoal.startDate && newGoal.durationValue && newGoal.durationUnit) {
      const start = new Date(newGoal.startDate);
      const end = new Date(start);
      
      switch (newGoal.durationUnit) {
        case 'days':
          end.setDate(start.getDate() + newGoal.durationValue);
          break;
        case 'weeks':
          end.setDate(start.getDate() + (newGoal.durationValue * 7));
          break;
        case 'months':
          end.setMonth(start.getMonth() + newGoal.durationValue);
          break;
        case 'years':
          end.setFullYear(start.getFullYear() + newGoal.durationValue);
          break;
      }
      newGoal.endDate = end.toISOString().split('T')[0];
    }

    const current = this.goals$.value;
    const updated = [...current, newGoal];
    this.save('goals', updated);
    this.goals$.next(updated);
  }

  updateGoal(goal: Goal) {
    const current = this.goals$.value;
    const index = current.findIndex(g => g.id === goal.id);
    if (index !== -1) {
      current[index] = goal;
      this.save('goals', current);
      this.goals$.next([...current]);
    }
  }

  toggleGoalCompletion(goalId: string, date: string) {
    const current = this.goals$.value;
    const index = current.findIndex(g => g.id === goalId);
    
    if (index !== -1) {
      const goal = { ...current[index] };
      
      if (goal.type === 'recurring') {
        const history = { ...(goal.history || {}) };
        
        if (history[date]) {
          delete history[date];
        } else {
          history[date] = true;
        }
        
        goal.history = history;
        
        // Progress Calculation V2
        if (goal.recurrenceType && goal.durationValue && goal.durationUnit && goal.startDate && goal.endDate) {
           this.calculateProgressV2(goal, history);
        } else {
           // Fallback V1
           // ... (simpler logic if needed)
        }
      } else {
        // Simple goal
        goal.completed = !goal.completed;
        goal.progress = goal.completed ? 100 : 0;
      }
      
      current[index] = goal;
      this.save('goals', current);
      this.goals$.next([...current]);
    }
  }

  private calculateProgressV2(goal: Goal, history: Record<string, boolean>) {
    const start = new Date(goal.startDate!);
    const end = new Date(goal.endDate!);
    const totalDurationDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    
    let totalTarget = 0;
    
    // Estimate total target sessions based on recurrence
    if (goal.recurrenceType === 'daily') {
      const interval = goal.recurrenceInterval || 1;
      totalTarget = Math.floor(totalDurationDays / interval);
    } else if (goal.recurrenceType === 'weekly') {
      const weeks = totalDurationDays / 7;
      const interval = goal.recurrenceInterval || 1;
      const daysPerWeek = goal.recurrenceDays?.length || 1; 
      // Occurrences = (Weeks / Interval) * DaysPerWeek
      totalTarget = Math.floor((weeks / interval) * daysPerWeek);
    } else if (goal.recurrenceType === 'monthly') {
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      const interval = goal.recurrenceInterval || 1;
      totalTarget = Math.floor(months / interval); 
    } else if (goal.recurrenceType === 'yearly') {
      const years = end.getFullYear() - start.getFullYear();
      const interval = goal.recurrenceInterval || 1;
      totalTarget = Math.floor(years / interval);
    }

    if (totalTarget > 0) {
      const completedCount = Object.keys(history).length;
      goal.progress = Math.min(Math.round((completedCount / totalTarget) * 100), 100);
      goal.completed = goal.progress >= 100;
    }
  }

  deleteGoal(id: string) {
    const current = this.goals$.value;
    const updated = current.filter(g => g.id !== id);
    this.save('goals', updated);
    this.goals$.next(updated);
  }

  // Tasks
  getTasks() { return this.tasks$.asObservable(); }

  addTask(task: Omit<Task, 'id'>) {
    const newTask: Task = { 
      ...task, 
      id: crypto.randomUUID(),
      history: task.isRecurring ? {} : undefined 
    };
    const current = this.tasks$.value;
    const updated = [...current, newTask];
    this.save('tasks', updated);
    this.tasks$.next(updated);
  }

  updateTask(task: Task) {
    const current = this.tasks$.value;
    const index = current.findIndex(t => t.id === task.id);
    if (index !== -1) {
      current[index] = task;
      this.save('tasks', current);
      this.tasks$.next([...current]);
    }
  }

  toggleTaskCompletion(taskId: string, date: string) {
    const current = this.tasks$.value;
    const index = current.findIndex(t => t.id === taskId);
    
    if (index !== -1) {
      const task = { ...current[index] };
      
      if (task.isRecurring) {
        const history = { ...(task.history || {}) };
        if (history[date]) {
          delete history[date];
        } else {
          history[date] = true;
        }
        task.history = history;
      } else {
        task.completed = !task.completed;
      }
      
      current[index] = task;
      this.save('tasks', current);
      this.tasks$.next([...current]);
    }
  }

  deleteTask(id: string) {
    const current = this.tasks$.value;
    const updated = current.filter(t => t.id !== id);
    this.save('tasks', updated);
    this.tasks$.next(updated);
  }

  // Ideas
  getIdeas() { return this.ideas$.asObservable(); }

  addIdea(idea: Omit<Idea, 'id' | 'createdAt'>) {
    const newIdea: Idea = { 
      ...idea, 
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    const current = this.ideas$.value;
    const updated = [newIdea, ...current];
    this.save('ideas', updated);
    this.ideas$.next(updated);
  }

  deleteIdea(id: string) {
    const current = this.ideas$.value;
    const updated = current.filter(i => i.id !== id);
    this.save('ideas', updated);
    this.ideas$.next(updated);
  }

  // Routine
  getRoutine() { return this.routine$.asObservable(); }

  addRoutineItem(item: Omit<RoutineItem, 'id'>) {
    const newItem: RoutineItem = { ...item, id: crypto.randomUUID() };
    const current = this.routine$.value;
    const updated = [...current, newItem];
    this.save('routine', updated);
    this.routine$.next(updated);
  }

  toggleRoutineItem(id: string) {
    const current = this.routine$.value;
    const index = current.findIndex(i => i.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], completed: !current[index].completed };
      this.save('routine', current);
      this.routine$.next([...current]);
    }
  }

  deleteRoutineItem(id: string) {
    const current = this.routine$.value;
    const updated = current.filter(i => i.id !== id);
    this.save('routine', updated);
    this.routine$.next(updated);
  }

  resetDailyRoutine() {
    const current = this.routine$.value;
    const updated = current.map(item => ({ ...item, completed: false }));
    this.save('routine', updated);
    this.routine$.next(updated);
  }
}

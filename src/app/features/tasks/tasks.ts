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

  taskForm = this.fb.group({
    title: ['', Validators.required],
    type: ['daily' as 'daily' | 'monthly' | 'annual', Validators.required],
    date: [new Date().toISOString().split('T')[0]],
    month: [new Date().getMonth()],
    year: [new Date().getFullYear()]
  });

  tasks$: Observable<Task[]> = combineLatest([
    this.dataService.getTasks(),
    this.selectedType$
  ]).pipe(
    map(([tasks, type]) => {
      return tasks.filter(task => {
        if (task.type !== type) return false;
        
        const now = new Date();
        if (type === 'daily') {
          // Filter by today or specific date logic if needed
          // For now, show all daily tasks or filter by today?
          // Let's filter by today for simplicity in this view context
          return task.date === new Date().toISOString().split('T')[0];
        }
        if (type === 'monthly') {
          return task.month === now.getMonth() && task.year === now.getFullYear();
        }
        if (type === 'annual') {
          return task.year === now.getFullYear();
        }
        return true;
      });
    })
  );

  months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  years = [2024, 2025, 2026, 2027, 2028];

  constructor() {
    // Update form type when tab changes
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
        date: new Date().toISOString().split('T')[0],
        month: new Date().getMonth(),
        year: new Date().getFullYear()
      });
    }
  }

  addTask() {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      this.dataService.addTask({
        title: formValue.title!,
        completed: false,
        type: formValue.type as 'daily' | 'monthly' | 'annual',
        date: formValue.date || undefined,
        month: formValue.month !== null ? +formValue.month! : undefined,
        year: formValue.year !== null ? +formValue.year! : undefined,
        createdAt: new Date().toISOString()
      });
      this.toggleForm();
    }
  }

  toggleTask(task: Task) {
    this.dataService.updateTask({ ...task, completed: !task.completed });
  }

  deleteTask(id: string) {
    if (confirm('¿Eliminar esta tarea?')) {
      this.dataService.deleteTask(id);
    }
  }
}

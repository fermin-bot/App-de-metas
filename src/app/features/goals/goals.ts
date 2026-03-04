import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data';
import { Goal } from '../../core/models/models';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './goals.html',
  styleUrl: './goals.scss'
})
export class Goals {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);
  
  goals$ = this.dataService.getGoals();
  showForm = false;

  goalForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    category: ['Personal', Validators.required],
    deadline: [''],
    progress: [0],
    type: ['simple' as 'simple' | 'recurring'],
    
    // UI Helper Field
    periodicity: ['daily' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'],

    // Recurring Fields
    recurrenceType: ['daily' as 'daily' | 'weekly' | 'monthly' | 'yearly'],
    recurrenceInterval: [1, [Validators.required, Validators.min(1)]],
    recurrenceDays: [[] as number[]],
    
    durationValue: [1, [Validators.required, Validators.min(1)]],
    durationUnit: ['months' as 'days' | 'weeks' | 'months' | 'years']
  });

  categories = ['Personal', 'Profesional', 'Financiero', 'Salud', 'Otro'];
  weekDays = [
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
    { id: 0, name: 'Domingo' }
  ];

  constructor() {
    // React to periodicity changes
    this.goalForm.get('periodicity')?.valueChanges.subscribe(val => {
      if (val === 'daily') {
        this.goalForm.patchValue({ recurrenceType: 'daily', recurrenceInterval: 1 });
      } else if (val === 'weekly') {
        this.goalForm.patchValue({ recurrenceType: 'weekly', recurrenceInterval: 1 });
      } else if (val === 'monthly') {
        this.goalForm.patchValue({ recurrenceType: 'monthly', recurrenceInterval: 1 });
      } else if (val === 'yearly') {
        this.goalForm.patchValue({ recurrenceType: 'yearly', recurrenceInterval: 1 });
      }
      // 'custom' does not auto-patch, leaves it to user
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.goalForm.reset({ 
      category: 'Personal', 
      progress: 0, 
      type: 'simple',
      periodicity: 'daily',
      recurrenceType: 'daily',
      recurrenceInterval: 1,
      recurrenceDays: [],
      durationValue: 1,
      durationUnit: 'months'
    });
  }

  toggleDay(dayId: number) {
    const currentDays = this.goalForm.get('recurrenceDays')?.value || [];
    const index = currentDays.indexOf(dayId);
    let newDays: number[];
    
    if (index === -1) {
      newDays = [...currentDays, dayId];
    } else {
      newDays = currentDays.filter(d => d !== dayId);
    }
    
    this.goalForm.patchValue({ recurrenceDays: newDays });
  }

  isDaySelected(dayId: number): boolean {
    return (this.goalForm.get('recurrenceDays')?.value || []).includes(dayId);
  }

  addGoal() {
    if (this.goalForm.valid) {
      const formValue = this.goalForm.value;
      
      const newGoal: Omit<Goal, 'id'> = {
        title: formValue.title!,
        description: formValue.description || '',
        category: formValue.category!,
        deadline: formValue.deadline || undefined,
        progress: formValue.progress || 0,
        completed: (formValue.progress || 0) === 100,
        type: formValue.type || 'simple'
      };

      if (formValue.type === 'recurring') {
        newGoal.startDate = new Date().toISOString().split('T')[0];
        
        // V2 Fields
        newGoal.recurrenceType = formValue.recurrenceType!;
        newGoal.recurrenceInterval = formValue.recurrenceInterval!;
        newGoal.recurrenceDays = formValue.recurrenceDays || [];
        newGoal.durationValue = formValue.durationValue!;
        newGoal.durationUnit = formValue.durationUnit!;
        
        // Backward compatibility
        newGoal.frequency = formValue.recurrenceType === 'weekly' ? 'weekly' : 
                            formValue.recurrenceType === 'daily' ? 'daily' : 'specific_days';
      }

      this.dataService.addGoal(newGoal);
      this.toggleForm();
    }
  }

  deleteGoal(id: string, event: Event) {
    event.stopPropagation();
    if(confirm('¿Estás seguro de eliminar esta meta?')) {
      this.dataService.deleteGoal(id);
    }
  }
}

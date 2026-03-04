import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data';
import { RoutineItem } from '../../core/models/models';
import { map } from 'rxjs/operators';

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

  routine$ = this.dataService.getRoutine().pipe(
    map(items => items.sort((a, b) => a.time.localeCompare(b.time)))
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

  toggleRoutineItem(item: RoutineItem) {
    this.dataService.toggleRoutineItem(item.id);
  }

  deleteRoutineItem(id: string) {
    if (confirm('¿Eliminar esta actividad?')) {
      this.dataService.deleteRoutineItem(id);
    }
  }

  resetDaily() {
    if (confirm('¿Reiniciar rutina para un nuevo día?')) {
      this.dataService.resetDailyRoutine();
    }
  }
}

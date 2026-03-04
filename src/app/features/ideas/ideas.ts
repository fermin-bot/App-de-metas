import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data';

@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ideas.html',
  styleUrl: './ideas.scss'
})
export class Ideas {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);

  ideas$ = this.dataService.getIdeas();

  ideaForm = this.fb.group({
    content: ['', Validators.required]
  });

  addIdea() {
    if (this.ideaForm.valid) {
      this.dataService.addIdea({
        content: this.ideaForm.value.content!
      });
      this.ideaForm.reset();
    }
  }

  deleteIdea(id: string) {
    if (confirm('¿Eliminar esta idea?')) {
      this.dataService.deleteIdea(id);
    }
  }
}

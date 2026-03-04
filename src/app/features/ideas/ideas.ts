import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data';
import { combineLatest, Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Idea } from '../../core/models/models';

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

  // Filters
  searchTerm$ = new BehaviorSubject<string>('');
  statusFilter$ = new BehaviorSubject<string>('all'); // all, apunte, en_proceso, desarrollada
  dateFilter$ = new BehaviorSubject<string>(''); // YYYY-MM-DD or empty

  ideas$: Observable<Idea[]> = combineLatest([
    this.dataService.getIdeas(),
    this.searchTerm$,
    this.statusFilter$,
    this.dateFilter$
  ]).pipe(
    map(([ideas, term, status, date]) => {
      return ideas.filter(idea => {
        const matchesTerm = idea.content.toLowerCase().includes(term.toLowerCase());
        const matchesStatus = status === 'all' || (idea.status || 'apunte') === status; // Default to apunte if undefined
        const matchesDate = !date || idea.targetDate === date;
        return matchesTerm && matchesStatus && matchesDate;
      });
    })
  );

  showForm = false;

  ideaForm = this.fb.group({
    content: ['', Validators.required],
    targetDate: [''],
    status: ['apunte' as 'apunte' | 'en_proceso' | 'desarrollada', Validators.required]
  });

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
       this.ideaForm.reset({ status: 'apunte' });
    }
  }

  addIdea() {
    if (this.ideaForm.valid) {
      this.dataService.addIdea({
        content: this.ideaForm.value.content!,
        targetDate: this.ideaForm.value.targetDate || undefined,
        status: (this.ideaForm.value.status as 'apunte' | 'en_proceso' | 'desarrollada') || 'apunte'
      });
      this.toggleForm();
    }
  }

  updateStatus(idea: Idea, newStatus: string) {
    const updated = { ...idea, status: newStatus as 'apunte' | 'en_proceso' | 'desarrollada' };
    this.dataService.updateIdea(updated);
  }

  deleteIdea(id: string) {
    if (confirm('¿Eliminar esta idea?')) {
      this.dataService.deleteIdea(id);
    }
  }

  // Filter setters
  setSearchTerm(term: string) { this.searchTerm$.next(term); }
  setStatusFilter(status: string) { this.statusFilter$.next(status); }
  setDateFilter(date: string) { this.dateFilter$.next(date); }
}

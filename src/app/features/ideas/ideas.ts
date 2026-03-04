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
  activeTab$ = new BehaviorSubject<'notas' | 'ideas'>('notas');

  ideas$: Observable<Idea[]> = combineLatest([
    this.dataService.getIdeas(),
    this.searchTerm$,
    this.statusFilter$,
    this.dateFilter$,
    this.activeTab$
  ]).pipe(
    map(([ideas, term, status, date, activeTab]) => {
      return ideas.filter(idea => {
        // Tab Filter
        if (activeTab === 'notas') {
          if ((idea.status || 'apunte') !== 'apunte') return false;
        } else {
          if ((idea.status || 'apunte') === 'apunte') return false;
        }

        const matchesTerm = idea.content.toLowerCase().includes(term.toLowerCase());
        const matchesStatus = status === 'all' || (idea.status || 'apunte') === status; 
        const matchesDate = !date || idea.targetDate === date;
        return matchesTerm && matchesStatus && matchesDate;
      });
    })
  );

  hasItems$: Observable<boolean> = combineLatest([
    this.dataService.getIdeas(),
    this.activeTab$
  ]).pipe(
    map(([ideas, activeTab]) => {
      if (activeTab === 'notas') {
        return ideas.some(i => (i.status || 'apunte') === 'apunte');
      } else {
        return ideas.some(i => (i.status || 'apunte') !== 'apunte');
      }
    })
  );

  showForm = false;

  ideaForm = this.fb.group({
    content: ['', Validators.required],
    targetDate: [''],
    status: ['apunte' as 'apunte' | 'en_proceso' | 'desarrollada', Validators.required]
  });

  setActiveTab(tab: 'notas' | 'ideas') {
    this.activeTab$.next(tab);
    this.statusFilter$.next('all');
    this.showForm = false;
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) {
       const currentTab = this.activeTab$.value;
       this.ideaForm.reset({ 
         status: currentTab === 'notas' ? 'apunte' : 'en_proceso' 
       });
    }
  }

  addIdea() {
    if (this.ideaForm.valid) {
      const currentTab = this.activeTab$.value;
      let finalStatus = this.ideaForm.value.status as 'apunte' | 'en_proceso' | 'desarrollada';

      // Force status based on tab to avoid errors
      if (currentTab === 'notas') {
        finalStatus = 'apunte';
      } else if (currentTab === 'ideas' && (!finalStatus || finalStatus === 'apunte')) {
        finalStatus = 'en_proceso';
      }

      this.dataService.addIdea({
        content: this.ideaForm.value.content!,
        targetDate: this.ideaForm.value.targetDate || undefined,
        status: finalStatus || 'apunte'
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

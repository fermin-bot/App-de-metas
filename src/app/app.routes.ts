import { Routes } from '@angular/router';
import { Layout } from './core/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'goals',
        loadComponent: () => import('./features/goals/goals').then(m => m.Goals)
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/tasks').then(m => m.Tasks)
      },
      {
        path: 'ideas',
        loadComponent: () => import('./features/ideas/ideas').then(m => m.Ideas)
      },
      {
        path: 'routine',
        loadComponent: () => import('./features/routine/routine').then(m => m.Routine)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

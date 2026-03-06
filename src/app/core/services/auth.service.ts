import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/models';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private router = inject(Router);

  // Current authenticated user
  private currentUser$ = new BehaviorSubject<User | null>(this.loadUser());

  // All users (mock database)
  private users: User[] = this.loadUsers();

  constructor() {}

  get currentUser(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  get currentUserValue(): User | null {
    return this.currentUser$.value;
  }

  private loadUser(): User | null {
    if (this.isBrowser) {
      const stored = localStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  }

  private loadUsers(): User[] {
    if (this.isBrowser) {
      const stored = localStorage.getItem('users_db');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  }

  private saveUsers() {
    if (this.isBrowser) {
      localStorage.setItem('users_db', JSON.stringify(this.users));
    }
  }

  register(user: Omit<User, 'id' | 'createdAt'>): boolean {
    if (this.users.some(u => u.email === user.email)) {
      return false; // Email already exists
    }

    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.saveUsers();
    
    // Auto login
    this.setCurrentUser(newUser);
    return true;
  }

  login(email: string, password: string): boolean {
    const user = this.users.find(u => u.email === email && u.password === password);
    if (user) {
      this.setCurrentUser(user);
      return true;
    }
    return false;
  }

  logout() {
    if (this.isBrowser) {
      localStorage.removeItem('currentUser');
    }
    this.currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  updateProfile(user: Partial<User>) {
    const current = this.currentUser$.value;
    if (current) {
      const updated = { ...current, ...user };
      
      // Update in users db
      const index = this.users.findIndex(u => u.id === current.id);
      if (index !== -1) {
        this.users[index] = updated;
        this.saveUsers();
      }

      this.setCurrentUser(updated);
    }
  }

  private setCurrentUser(user: User) {
    if (this.isBrowser) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
    this.currentUser$.next(user);
  }

  isAuthenticated(): boolean {
    return !!this.currentUser$.value;
  }
}

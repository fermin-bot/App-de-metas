import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout {
  menuItems = [
    { label: 'Inicio', path: '/dashboard', icon: 'home' },
    { label: 'Metas', path: '/goals', icon: 'target' },
    { label: 'Tareas', path: '/tasks', icon: 'list' },
    { label: 'Ideas', path: '/ideas', icon: 'bulb' },
    { label: 'Rutina', path: '/routine', icon: 'clock' },
    { label: 'Perfil', path: '/profile', icon: 'user' },
  ];
}

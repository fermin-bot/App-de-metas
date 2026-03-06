import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  currentUser: User | null = null;
  isEditing = false;
  message = '';

  profileForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.profileForm.patchValue({
          username: user.username,
          email: user.email
        });
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.currentUser) {
      // Reset form on cancel
      this.profileForm.patchValue({
        username: this.currentUser.username,
        email: this.currentUser.email
      });
    }
  }

  onSubmit() {
    if (this.profileForm.valid && this.currentUser) {
      const { username, email } = this.profileForm.value;
      
      this.authService.updateProfile({
        username: username!,
        email: email!
      });

      this.isEditing = false;
      this.message = 'Perfil actualizado correctamente';
      setTimeout(() => this.message = '', 3000);
    }
  }

  logout() {
    this.authService.logout();
  }
}

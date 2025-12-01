import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { FirestoreService } from './services/firestore.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'Tachikoma Console';

  private authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);

  ngOnInit(): void {
    // Auth state listener is automatically initialized in AuthService constructor
    // Subscribe to auth changes to trigger sync on login
    // The AuthService already initializes the listener, we just need to
    // handle the sync when a user logs in

    // We use an interval check to detect login for sync
    // This is a simple approach; alternatively we could use effects
    let wasAuthenticated = false;

    // Check auth state periodically and trigger sync on login
    const checkAuth = () => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth && !wasAuthenticated) {
        // User just logged in, trigger sync
        console.log('User logged in, triggering sync...');
        this.firestoreService.syncOnLogin();
      }
      wasAuthenticated = isAuth;
    };

    // Initial check
    setTimeout(checkAuth, 1000);

    // Periodic check (every 2 seconds)
    setInterval(checkAuth, 2000);
  }
}

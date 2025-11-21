import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';

export const PagesRoutes: Routes = [
  {
    path: '',
    component: StarterComponent,
    data: {
      title: 'Dashboard',
      urls: [
        { title: 'Home', url: '/dashboard' },
        { title: 'Dashboard' },
      ],
    },
  },
];

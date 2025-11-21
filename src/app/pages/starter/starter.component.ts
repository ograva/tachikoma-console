import { Component, ViewEncapsulation } from '@angular/core';
import { MaterialModule } from '../../material.module';
import { Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-starter',
  imports: [
    MaterialModule,
    TablerIconsModule
  ],
  templateUrl: './starter.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class StarterComponent {
  constructor(private router: Router) {}

  navigateToProtocol() {
    this.router.navigate(['/tachikoma']);
  }
}

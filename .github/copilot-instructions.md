# Flexy Angular Admin Dashboard - AI Coding Guidelines

## Project Overview
Flexy is an Angular 19 admin dashboard template featuring a two-layout architecture (Full/Blank), Material Design components, and ApexCharts integration. This is a **free version** with PRO features linked externally to `flexy-angular-main.netlify.app`.

## Architecture

### Layout System
- **FullComponent** (`layouts/full/`): Main authenticated layout with header, sidebar, and content area
- **BlankComponent** (`layouts/blank/`): Minimal layout for authentication pages
- Routes wrapped in layout components via route configuration in `app.routes.ts`
- Responsive breakpoints: Mobile (<768px), Tablet (769-1024px), Desktop (>1024px)

### State Management Pattern
Uses Angular 19 **signals** for reactive state (not RxJS Subjects):
```typescript
// Example from CoreService
private optionsSignal = signal<AppSettings>(defaults);
getOptions() { return this.optionsSignal(); }
setOptions(options: Partial<AppSettings>) {
  this.optionsSignal.update((current) => ({ ...current, ...options }));
}
```
- `NavService.currentUrl` tracks navigation via signal
- Avoid introducing traditional observables for new state

### Module Organization
- **Standalone components** (Angular 19 pattern) - no NgModules except `MaterialModule`
- `MaterialModule`: Central re-export of all Material imports (39+ modules)
- `TablerIconsModule`: Icon system using `angular-tabler-icons`
- Import `MaterialModule` in components, never individual Material modules

### Navigation Structure
Navigation defined in `sidebar-data.ts` using `NavItem` interface:
```typescript
interface NavItem {
  displayName?: string;
  iconName?: string;      // Tabler icon name
  navCap?: string;        // Category header
  route?: string;
  children?: NavItem[];   // Nested navigation
  chip?: boolean;         // PRO badge indicator
  external?: boolean;     // External link flag
}
```
- Free features route locally (e.g., `/ui-components/badge`)
- PRO features link to `https://flexy-angular-main.netlify.app/...` with `external: true`

## Development Workflows

### Commands
```bash
npm start          # Dev server (default port 4200)
npm run build      # Production build → dist/Flexy
npm run watch      # Watch mode with dev config
npm test           # Karma + Jasmine tests
```

### Build Configuration
- Production budget: 12MB (unusually high - verify if intentional)
- Output: `dist/Flexy` directory
- Netlify SPA redirect configured via `netlify.toml`

### Styling System
- **SCSS architecture** in `src/assets/scss/`:
  - `style.scss`: Root import file
  - `_variables.scss`: Global Sass variables
  - `helpers/`: Utility classes (spacing, flexbox, colors)
  - `override-component/`: Material component customizations
  - `themecolors/`: Theme definitions (default: orange_theme)
- Component styles use `styleUrls` with SCSS
- Material theme applied via `@use "@angular/material" as mat;`

## Project-Specific Conventions

### Component Creation
```typescript
// Standalone pattern (Angular 19)
@Component({
  selector: 'app-example',
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent { }
```
- Always include `imports` array (no module declarations)
- Selector prefix: `app-`
- Use `ViewEncapsulation.None` only when customizing Material themes globally

### Routing Patterns
```typescript
// Lazy loading with loadChildren
{
  path: 'feature',
  loadChildren: () => import('./pages/feature/feature.routes')
    .then((m) => m.FeatureRoutes)
}
```
- Route files named `*.routes.ts` exporting `Routes` constant
- All routes nested under `FullComponent` or `BlankComponent`

### Service Injection
- All services use `providedIn: 'root'` (singleton pattern)
- No manual provider registration in components
- Example services: `CoreService` (settings), `NavService` (navigation state)

### Responsive Handling
```typescript
// BreakpointObserver pattern from FullComponent
this.breakpointObserver.observe([MOBILE_VIEW, TABLET_VIEW])
  .subscribe((state) => {
    this.isMobileScreen = state.breakpoints[MOBILE_VIEW];
  });
```
- Use CDK `BreakpointObserver` for layout shifts
- Store breakpoint state in component properties

## Key Files Reference
- `app.config.ts`: Application providers (router, HTTP, Material, i18n)
- `material.module.ts`: Single source for all Material imports
- `sidebar-data.ts`: Navigation menu configuration
- `config.ts`: App-wide settings interface and defaults
- `angular.json`: Build configuration with CommonJS dependency allowlist

## Common Pitfalls
- **Don't** import individual Material modules - always use `MaterialModule`
- **Don't** use RxJS BehaviorSubject for new state - use Angular signals
- **Don't** create NgModules - use standalone component pattern
- **Don't** modify `allowedCommonJsDependencies` without understanding bundle impact
- **Verify** PRO features aren't implemented locally - they should link externally

## External Dependencies
- **ApexCharts** (`ng-apexcharts`): Chart library for dashboards
- **ngx-scrollbar**: Custom scrollbar styling
- **ngx-translate**: i18n support (TranslateModule configured in app.config)
- Material Design theming via Sass `@use` imports

## Testing Notes
- Jasmine/Karma configured with Angular defaults
- Test files: `*.spec.ts` alongside components
- Coverage output via `karma-coverage`

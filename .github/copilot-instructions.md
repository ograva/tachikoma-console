# Tachikoma Console - AI Coding Guidelines

## Project Overview

**Tachikoma Console** is a cyberpunk-themed Angular 19 admin dashboard with an integrated AI chat interface. Originally forked from Flexy Angular Admin, it features a **multi-agent AI system** powered by Google's Gemini API, a dark cyberpunk aesthetic, and Material Design components.

## Core Features

### Tachikoma Chat (Primary Feature)

A **multi-agent AI chat interface** (`/tachikoma`) featuring three distinct AI personas powered by Google Gemini 2.0 Flash Exp:

#### Agent System Architecture

- **LOGIKOMA** (Analytical Agent)

  - Temperature: 0.2 (low creativity, high precision)
  - Role: Pure logic and data analysis
  - Color: Cyan (`#00f3ff`)
  - Icon: ◈

- **GHOST-1** (Philosophical Agent)

  - Temperature: 0.9 (high creativity, abstract thinking)
  - Role: Questions assumptions, explores meaning
  - Color: Magenta (`#ff00de`)
  - Icon: ❖

- **MODERATOR** (Synthesis Agent)
  - Temperature: 0.5 (balanced)
  - Role: Bridges logic and philosophy, provides final synthesis
  - Color: Green (`#00ff41`)
  - Icon: ⬢

#### Chat Protocol Flow

1. User submits query
2. LOGIKOMA and GHOST-1 process in **randomized order** (prevents response bias)
3. Each agent reads prior context and implements **SILENCE PROTOCOL**: If previous agent already covered their perspective, agent outputs "SILENCE" instead of repeating
4. MODERATOR synthesizes all responses into final answer
5. All messages rendered with **Markdown support** via `marked` library

#### Technical Implementation

- **Component**: `src/app/pages/tachikoma-chat/tachikoma-chat.component.ts`
- **API Integration**: `@google/genai` SDK (replaces deprecated `@google/generative-ai`)
- **State Management**: Component-level signals (Angular 19 pattern)
- **Persistence**: API key stored in `localStorage` (key: `gemini_api_key`)
- **Security**: API key sanitization via `getCleanKey()` regex to strip non-ASCII characters
- **UI Framework**: Custom SCSS with cyberpunk theme, no Material Design used in chat

#### Key Methods

```typescript
triggerProtocol(); // Main orchestration: shuffles agents, calls API sequentially
callGemini(); // Google Generative AI API wrapper with error handling
getCleanKey(); // Sanitizes API key (removes non-ISO-8859-1 characters)
saveKey(); // Persists sanitized API key to localStorage
addMessage(); // Adds message to chat feed with Markdown parsing
```

#### UI/UX Features

- **Neural Activity Panel**: Real-time agent status visualization controlled by `showNeuralActivity` signal

  - Appears when `triggerProtocol()` starts processing
  - Auto-hides when all agents complete responses
  - Shows processing states: "INITIALIZING", "PROCESSING", "SYNTHESIZING", "COMPLETE"
  - Responsive display: Desktop (side panel), Mobile (overlay section)

- **First-Time User Explainer**: Modal dialog (`ChatExplainerDialogComponent`) shown on first visit

  - Explains multi-agent system workflow
  - Describes agent roles and capabilities
  - Displays pro tips for optimal usage
  - Tracked via `localStorage.getItem('tachikoma_chat_explainer_seen')`
  - Triggered in `ngOnInit()` via `checkAndShowExplainer()`

- **Chat Export**: Export conversations to PDF/DOCX formats
  - PDF generation via jsPDF library
  - DOCX generation via docx library
  - File download via file-saver
  - Export button located in chat header

#### Styling Conventions

- **Custom CSS Variables** in component SCSS:
  - `--neon-green: #00ff41`
  - `--neon-blue: #00f3ff`
  - `--neon-pink: #ff00de`
  - `--cyber-black: #0a0a0a`
- **Fonts**: `JetBrains Mono` (body), `Share Tech Mono` (headers)
- **Effects**: CRT scanlines overlay, glitch animations on hover
- **Responsive**: Unified header layout on mobile/desktop, conditional neural activity display

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
  iconName?: string; // Tabler icon name
  navCap?: string; // Category header
  route?: string;
  children?: NavItem[]; // Nested navigation
  chip?: boolean; // PRO badge indicator
  external?: boolean; // External link flag
}
```

- **Primary route**: `/tachikoma` - AI Chat interface (direct route in `app.routes.ts`)
- Dashboard features route to `/dashboard` (lazy-loaded via `pages.routes.ts`)
- Legacy PRO features link to `https://flexy-angular-main.netlify.app/...` with `external: true`

## Development Workflows

### Commands

```bash
npm start          # Dev server (default port 4200)
npm run build      # Production build → dist/Flexy
npm run watch      # Watch mode with dev config
npm test           # Karma + Jasmine tests
```

### Build Configuration

- Production budget: 12MB (high due to AI SDK and ApexCharts)
- Output: `dist/tachikoma-console` directory
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
  selector: "app-example",
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: "./example.component.html",
  styleUrls: ["./example.component.scss"],
})
export class ExampleComponent {}
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
this.breakpointObserver.observe([MOBILE_VIEW, TABLET_VIEW]).subscribe((state) => {
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

## Branding and Theme

### Visual Identity

- **Logo**: `sac-logo-white.png` used in sidebar (`branding.component.ts`) and login page
- **Color Scheme**: Cyberpunk dark theme with neon accents
  - Cyan: #00f3ff (LOGIKOMA)
  - Magenta: #ff00de (GHOST-1)
  - Green: #00ff41 (MODERATOR)
  - Background: #0a0a0a gradient to #1a1a2e
- **PWA Icons**: Located in `assets/images/icons/` with multiple sizes (36x36 to 310x310)
  - Configured in `public/manifest.webmanifest`
  - Linked in `src/index.html` (favicon, apple-touch-icon)

### Theme Consistency

- **Login Page**: Dark theme with cyberpunk aesthetic (`side-login.component.scss`)
  - Gradient background matching main app
  - Mat-card with rgba(26, 26, 46, 0.95) background
  - Cyan border accents on inputs and buttons
- **Dashboard**: Informative landing page with app introduction, feature grid, agent descriptions
- **Chat Interface**: Full cyberpunk styling with CRT effects and neon borders
- **No Theme Toggle**: Theme toggle button removed from header for consistent dark mode experience

## Common Pitfalls

- **Don't** import individual Material modules - always use `MaterialModule`
- **Don't** use RxJS BehaviorSubject for new state - use Angular signals
- **Don't** create NgModules - use standalone component pattern
- **Don't** modify `allowedCommonJsDependencies` without understanding bundle impact
- **Don't** forget to sanitize API keys - use `getCleanKey()` pattern for external APIs
- **Don't** forget to import `TablerIconsModule` in components using `<i-tabler>` elements
- **Verify** PRO features aren't implemented locally - they should link externally
- **Responsive Design**: Always test mobile layouts - use unified header structure, avoid desktop-only classes

## External Dependencies

- **@google/genai**: Gemini API SDK for multi-agent AI chat (replaces deprecated `@google/generative-ai`)
- **marked**: Markdown parser for chat message rendering
- **jspdf**: PDF export functionality
- **docx**: Word document export functionality
- **file-saver**: Client-side file download utility
- **@angular/fire**: Firebase integration (auth, firestore)
- **ApexCharts** (`ng-apexcharts`): Chart library for dashboards
- **ngx-scrollbar**: Custom scrollbar styling
- **ngx-translate**: i18n support (TranslateModule configured in app.config)
- Material Design theming via Sass `@use` imports

## Testing Notes

- Jasmine/Karma configured with Angular defaults
- Test files: `*.spec.ts` alongside components
- Coverage output via `karma-coverage`

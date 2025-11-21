# Novus Flexy

A modern Angular 19 admin dashboard starter template customized by **Novus Apps** for rapid application development.

## Overview

Novus Flexy is a clean, professional admin dashboard template that provides a solid foundation for building modern web applications. It comes with essential features pre-configured, allowing you to focus on building your application's unique functionality rather than setting up the basic infrastructure.

## Technology Stack

- **Angular 19** - Latest framework with standalone components architecture
- **Angular Material 19** - Comprehensive Material Design UI component library
- **TypeScript 5.6** - Type-safe development with latest language features
- **SCSS** - Advanced styling with Sass preprocessor
- **ESBuild** - Lightning-fast application builder for optimal development experience
- **Tabler Icons** - Beautiful and consistent icon library
- **ApexCharts** - Modern, interactive charting library
- **RxJS** - Reactive programming with observables
- **Angular Signals** - Modern reactive state management

## Features

- ✅ **Standalone Components** - Modern Angular architecture without NgModules
- ✅ **Responsive Layout** - Mobile-first design that works on all devices
- ✅ **Two Layout System** - Full layout (with sidebar) and Blank layout (for auth pages)
- ✅ **Authentication Pages** - Pre-built login and register pages
- ✅ **Material Design** - Comprehensive Material UI components
- ✅ **Customizable Theme** - Easy SCSS-based theme customization
- ✅ **Clean Navigation** - Sidebar navigation with route management
- ✅ **Fast Builds** - ESBuild-based compilation for rapid development

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd novus-flexy

# Install dependencies
npm install
```

### Development Server

```bash
# Start development server
npm start

# or
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload when you make changes to source files.

### Build

```bash
# Production build
npm run build

# Output will be in dist/NovusFlexy/
```

### Testing

```bash
# Run unit tests
npm test
```

## Project Structure

```
novus-flexy/
├── src/
│   ├── app/
│   │   ├── components/        # Reusable components
│   │   ├── layouts/
│   │   │   ├── full/          # Main layout with sidebar
│   │   │   └── blank/         # Blank layout for auth pages
│   │   ├── pages/             # Page components
│   │   │   ├── authentication/
│   │   │   └── starter/       # Dashboard home page
│   │   ├── services/          # Application services
│   │   ├── app.config.ts      # Application configuration
│   │   └── app.routes.ts      # Route definitions
│   └── assets/
│       └── scss/              # Global styles and themes
└── angular.json               # Angular CLI configuration
```

## Customization

### Adding New Routes

Edit `src/app/app.routes.ts` to add new routes to your application.

### Customizing Navigation

Edit `src/app/layouts/full/sidebar/sidebar-data.ts` to modify the sidebar navigation menu.

### Theme Customization

Modify SCSS files in `src/assets/scss/` to customize colors, spacing, and other theme properties.

### Creating New Components

```bash
ng generate component components/my-component
```

## Key Configuration Files

- `package.json` - Project dependencies and scripts
- `angular.json` - Angular CLI build configuration
- `tsconfig.json` - TypeScript compiler options
- `app.config.ts` - Application-wide providers and configuration

## Built With

This template is built on top of the Flexy Angular template, customized and optimized for Novus Apps projects.

## License

This project is licensed for use by Novus Apps and its clients.

## Support

For issues, questions, or feature requests, please contact the Novus Apps development team.

---

**Built with ❤️ by Novus Apps**

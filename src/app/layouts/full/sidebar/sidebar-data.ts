import { NavItem } from './nav-item/nav-item';

export const navItems: NavItem[] = [
  {
    navCap: 'Home',
  },
  {
    displayName: 'Dashboard',
    iconName: 'layout-grid-add',
    route: '/dashboard',
  },
  {
    displayName: 'Tachikoma Chat',
    iconName: 'message-chatbot',
    route: '/tachikoma',
  },
  {
    displayName: 'Tachikomas',
    iconName: 'settings',
    route: '/tachikoma-profiles',
  },
];

// Auth-related nav items - these will be dynamically shown/hidden
export const authNavItems: NavItem[] = [
  {
    navCap: 'Account',
  },
  {
    displayName: 'Profile',
    iconName: 'user',
    route: '/profile',
  },
];

export const loginNavItem: NavItem = {
  displayName: 'Login',
  iconName: 'login',
  route: '/authentication/login',
};

export const logoutNavItem: NavItem = {
  displayName: 'Logout',
  iconName: 'logout',
  route: '/authentication/login', // Will be handled by click, not route
  isLogout: true, // Custom flag to identify this is a logout action
};

export const registerNavItem: NavItem = {
  displayName: 'Register',
  iconName: 'user-plus',
  route: '/authentication/register',
};

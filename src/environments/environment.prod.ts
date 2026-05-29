export const environment = {
  production: true,
  useEmulators: false,
  emulators: {
    auth: { host: '127.0.0.1', port: 9098 },
    firestore: { host: '127.0.0.1', port: 8085 },
    storage: { host: '127.0.0.1', port: 9199 },
  },
  firebase: {
    // Firebase configuration - to be populated by the user
    // Get these values from Firebase Console > Project Settings > General > Your apps
    apiKey: 'AIzaSyCs1BB64kAYt-nilCV1oPSuga0E0bYtIRM',
    authDomain: 'novusinc-8df79.firebaseapp.com',
    databaseURL: 'https://novusinc-8df79.firebaseio.com',
    projectId: 'novusinc-8df79',
    storageBucket: 'tachikoma-chat',
    messagingSenderId: '136052275501',
    appId: '1:136052275501:web:94c7a2f6a7b23592bdfba4',
    firestoreDatabaseId: 'tachikoma-chat',
  },
};

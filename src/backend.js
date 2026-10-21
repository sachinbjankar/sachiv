// Picks the real Firebase backend, or the stand-in when built with `--mode mock` for testing.
export const backend = import.meta.env.MODE === 'mock'
  ? (await import('./backend-mock.js')).backend
  : (await import('./backend-firebase.js')).backend;

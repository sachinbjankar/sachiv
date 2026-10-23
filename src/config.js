// Firebase web app config for the Sachiv project (sachiv-fe17b).
// These values identify the Firebase project; they are not secret passwords.
// Data is protected by the rules in firestore.rules, not by hiding these.
export const firebaseConfig = {
  apiKey: 'AIzaSyDcF9AUj1BIlwJYtGQ-QtBbOGXAqdhcrxw',
  authDomain: 'sachiv-fe17b.firebaseapp.com',
  projectId: 'sachiv-fe17b',
  storageBucket: 'sachiv-fe17b.firebasestorage.app',
  messagingSenderId: '464250681017',
  appId: '1:464250681017:web:94ddfc540fc6307f3ccd68',
  measurementId: 'G-L72ZRD95PG'
};

// The app owner (you). This verified email can open the owner panel and extend any society's plan.
// The same email is written in firestore.rules; change both together.
export const OWNER_EMAIL = 'sachin.bjankar@gmail.com';
// Shown to committees when their free trial or plan ends.
export const SUPPORT_EMAIL = 'sachin.bjankar@gmail.com';
export const TRIAL_DAYS = 30;

// Public website (GitHub Pages). The society QR poster points to SITE_URL/site/join.html?c=CODE
export const SITE_URL = 'https://sachinbjankar.github.io/sachiv';

// Monthly price per society, by number of flats. Change here to change it everywhere in the app.
export const PLANS = [
  { maxFlats: 50, price: 699 },
  { maxFlats: 150, price: 1499 },
  { maxFlats: Infinity, price: 1999 }
];
export const priceFor = flatCount => (PLANS.find(p => (Number(flatCount) || 0) <= p.maxFlats) || PLANS[PLANS.length - 1]).price;

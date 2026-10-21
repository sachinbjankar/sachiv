# Sachiv: digital secretary for housing societies

Committee members and residents of many societies share one app. Each society only sees its own data.

**Committee:** register the society, add flats (paste from Excel), approve residents, record payments, approve UPI payments, send WhatsApp reminders, publish notices and minutes on a letterhead image, and handle complaints.

**Residents:** see their dues, pay by UPI straight to the society's account, report the payment (UTR), read notices and raise complaints.

## How it is built
- Web app (Vite, plain JavaScript) wrapped as an Android app with Capacitor.
- Firebase Authentication (email + password) and Cloud Firestore. The free Spark plan is enough for hundreds of societies.
- `firestore.rules` keeps every society private.
- GitHub Actions builds `Sachiv.apk` on every push to `main` and attaches it to a Release. It also publishes the web version on GitHub Pages.

## One-time setup
1. **Firebase:** go to console.firebase.google.com and create a project.
   - Build → Authentication → Get started → turn on **Email/Password**.
   - Build → Firestore Database → Create database (production mode, region `asia-south1` Mumbai). Then open **Rules**, paste in `firestore.rules`, and click Publish.
   - Project settings → Your apps → Web (`</>`) → register the app, then copy the `firebaseConfig` values into `src/config.js`.
   - For the web version: Authentication → Settings → Authorized domains → add `<your-github-username>.github.io`.
2. **GitHub:** push this folder to a repository. Then go to Settings → Pages → Source: **GitHub Actions**.
3. Every push builds a new APK. Download it from the repository's **Releases** page.

## Payments
Residents pay by UPI directly into the society's own account, so there is no gateway fee and no KYC. The resident then submits the UTR number, and the committee approves it, which marks the month as paid. Automatic confirmation through Razorpay or Cashfree can be added later.

## Local development
```
npm install
npm run dev           # real Firebase
npm run build:mock    # offline test build, data stays in the browser
```

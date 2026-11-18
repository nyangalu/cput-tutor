// ============================================================
//  CPUT First-Year Tutor Bot — configuration
//  Edit this file after you create your Firebase project and
//  Cloudflare Worker (see README.md, steps 1–4).
//  While apiKey still starts with "YOUR_", the app runs in
//  DEMO MODE (data saved only in this browser, sample replies).
// ============================================================
window.TUTOR_CONFIG = {
  appName: "CPUT First-Year Tutor",
  courseCode: "IED150S",
  lecturerName: "Mr L Nyanga",

  // Students log in with their student number. Behind the scenes their
  // account e-mail is  <studentnumber>@<emailDomain>, which is their myCPUT
  // address, so "Forgot password" e-mails reach their CPUT inbox.
  // If you change this, change it in database.rules.json too.
  emailDomain: "mycput.ac.za",

  // Staff register with their CPUT e-mail (must end with this) and log in
  // with their staff number. Change in database.rules.json too.
  staffEmailDomain: "cput.ac.za",

  // true = students must click the link sent to their myCPUT inbox before
  // the tutor opens. Strongly recommended (stops people registering with
  // someone else's student number).
  requireEmailVerification: true,

  // Your Cloudflare Worker URL (worker.js). Holds the Anthropic API key.
  proxyUrl: "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev",

  // Firebase → Project settings → General → Your apps → Web app config
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    appId: "YOUR_APP_ID"
  }
};

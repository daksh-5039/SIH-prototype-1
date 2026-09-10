# Rahi: two-hour launch checklist

## What is implemented

- Email/password accounts via Firebase Authentication. Passwords are managed by Firebase Auth and are **not** stored in Firestore.
- A `users/{uid}` profile document and private `users/{uid}/trips` saved itineraries.
- Public, authenticated reviews stored in Firestore; authors can only modify their own records.
- Live current weather from Open-Meteo (no API key), with the original demo data as a fallback.
- Real-time community crowd reporting: authenticated travellers submit a current crowd read, and all viewers receive Firestore updates immediately. Only reports from the last 30 minutes affect the live status.
- Firebase Hosting configuration and production Firestore security rules.

## Launch this in order (about 20 minutes)

1. Create a free project at <https://console.firebase.google.com/>. Choose **Add project**, name it `rahi-sih`, and continue with Analytics disabled to save time.
2. In **Build → Authentication → Get started**, enable **Email/Password**. Do not enable anonymous authentication for this prototype.
3. In **Build → Firestore Database**, create a database in Production mode and select the closest region. Open **Rules**, replace everything with the contents of [firestore.rules](firestore.rules), then click **Publish**.
4. In **Project settings → Your apps**, create a Web app (do not select Hosting here). Copy its `firebaseConfig` values into [js/firebase-config.js](js/firebase-config.js), replacing every `PASTE_...` value. The Firebase web config is intended to be public; the Firestore rules protect data.
5. Install Node.js LTS if it is not already installed, then open PowerShell in this folder and run:

   ```powershell
   npm install -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy
   ```

   Select the project you created. Firebase prints the free public URL (`https://PROJECT_ID.web.app`) after deployment.
6. Open the deployed URL in an incognito/private window. Create an account, publish a review, refresh, and confirm the review persists. Save a planner itinerary, log out, and log back in to confirm credentials work.

## Demo script for SIH judges

1. Search a destination from the home page; the selection carries through every tool.
2. Open **Weather Advisory** to show live current temperature from Open-Meteo.
3. Open **Crowd & Peak Hours** to show live visitor reports. Create two test accounts/windows, submit reports, and show the live status update immediately. The chart remains a historical hourly pattern, clearly separate from the live reports.
4. In **Trip Planner**, add nearby places, choose travel mode, sign in, and select **Save this itinerary**.
5. Submit a review, refresh the page, and show that it remains: that demonstrates database persistence.

## Before calling it a production booking platform

This prototype does not take payments or issue tickets/hotel reservations. Do not add Razorpay/Stripe, live hotel booking, or scraped travel prices without their merchant/account setup and server-side verification. For the next iteration, use a server or Cloud Functions for payment webhooks and any paid/secret-key travel API; never place secret keys in browser JavaScript.

## API notes

- The weather implementation calls Open-Meteo directly from [js/weather.js](js/weather.js). It needs no account/key for this demo.
- Hourly crowd-chart values, travel options, and cost estimates currently originate in [js/data.js](js/data.js). The current crowd status is now based on recent user reports, not those static values. For a verified sensor-grade system, integrate venue counters, Wi-Fi/Bluetooth analytics, or a government/venue data feed with user consent.
- To add a paid/secret API later, create a Cloud Function endpoint and call that endpoint from the browser. Keep provider tokens only in Firebase/Google Cloud secrets.

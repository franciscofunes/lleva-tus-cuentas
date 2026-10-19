# LTC$ — External notifications and PWA decision record

Status: research / **not shipped**. Updated 2026-10-18. Owners: LTC$ (React/Firebase) and Lita (Next.js/Vercel).

## Current behavior and goal

LTC already has an installable **manifest** (\`public/manifest.json\`), icons and HTTPS at \`llevatuscuentas.vercel.app\`. That **does not mean offline mode or background Web Push is implemented**. As of this decision, LTC displays owner-local bell notices, in-session toast events and optional browser notifications only while open. No phone or email should ever be sent without an explicit user opt-in.

Desired experience: user imports current card consumption from home-banking screenshots, chooses a personalized ceiling after reviewing PDF history and Lita suggestions, and receives an actionable external warning **only after** a server-side, idempotent evaluator detects a new threshold event. The savings message is a prompt to review the app, never authoritative bank advice.

## Capability by channel (verified 2026-10-18)

| Option | Realistic free tier / cost | App closed? | Recommendation |
| --- | --- | --- | --- |
| Standards-based PWA Web Push + **Firebase Cloud Messaging (FCM)** | Cloud Messaging itself is listed as **no-cost**. Firebase Authentication/Firestore reads, secure backend compute and Vercel Functions have their **own** limits/billing. | Yes on supported browser/device once subscribed and permitted | **First choice** for LTC given existing Firebase identity and Android/Chrome, server can reside in Lita |
| **Resend** transactional email | $0 starter, **3,000 emails per month, max 100 per day**; verified sending domain required | Yes | **Second choice**, opt-in digest or only critical alerts |
| **Brevo** transactional email | Free plan permits **300 emails/day**, branding and other limits apply | Yes | Alternative if domain/volume needs favor Brevo |
| **OneSignal** Web Push | Free offering and platform limits can change; 2026 changes include mobile MAU cap. Reconfirm specifically **web** subscribers/quotas before provider lock-in | Yes when correctly integrated | Simpler managed alternative but adds identity/token integration and vendor dependency |
| **Twilio** SMS to Argentina | **Pay-per-message, not an ongoing free tier**. Official public page lists approx. **US$0.1034 per outbound SMS segment** via international number, plus number/carrier fees and possible trial restrictions | Yes | **Not recommended** as default for frequent budget warnings; consider only explicit paid critical fallback |

Official references:
- FCM: https://firebase.google.com/pricing/ and https://firebase.google.com/docs/cloud-messaging/web/get-started
- Apple Home Screen Web Push (iOS/iPadOS 16.4+): https://webkit.org/blog/13878/
- Apple Web Push backend requirement: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- Resend: https://resend.com/pricing
- Brevo: https://help.brevo.com/hc/es/articles/208580669-FAQ-Cu%C3%A1les-son-los-l%C3%ADmites-del-plan-Gratis
- Twilio AR: https://www.twilio.com/en-us/sms/pricing/ar
- Vercel Cron: https://vercel.com/docs/cron-jobs/usage-and-pricing and https://vercel.com/docs/cron-jobs/manage-cron-jobs

## Technical path to real PWA push

1. **Feature-detect** \`'serviceWorker' in navigator\`, \`'PushManager' in window\` and \`'Notification' in window\`; request permission **only upon user action**, never on first load. Apple iOS/iPadOS Web Push requires Home Screen-installed web apps (iOS 16.4+); Android/Chrome supports Web Push on HTTPS with the appropriate browser settings. Battery/OS and browser restrictions may still delay notifications.
2. Register a **stable, limited service worker** at LTC's origin (avoid interfering with Firebase login and SPA navigation). It receives push events with a privacy-safe message, opens \`/bancos\` on tap and handles subscription updates/revocations.
3. Generate FCM/VAPID client subscriptions per device. Store **only token, timestamps and delivery prefs** under strict \`users/{uid}/pushSubscriptions/{deviceId}\` rules. Protect against cross-user access and permit device-level revoke/logout cleanup. Do **not** commit tokens or put server credentials into \`REACT_APP_*\` values; VAPID public key is intentionally public.
4. Implement an authenticated *server-side* dispatcher in **Lita Next.js/Vercel**, using Firebase Admin/service account available only in Vercel server environment. Never trust client-supplied user IDs, ceiling ratios or message amounts. Fetch authorized user data using server rules, apply deterministic card-budget evaluation and check active preferences.
5. Persist an idempotent **delivery outbox** key \`uid:currency:billing-window:level:channel\`; use a transaction / lease and TTL, suppress repeats after a user acknowledged a warning, handle token expiry, failures and retries. **Never include bank names, balances or exact amounts in push lock-screen body by default**. CTA links to authenticated LTC instead.
6. Trigger on a **trusted event** following snapshot/charge import or a scheduled backend check for due dates. There is no automatic event when a user makes a purchase at the bank without uploading a new screenshot. Vercel Cron Pro supports frequent runs; Hobby timing restrictions are stricter. Authenticate scheduled invocations with \`CRON_SECRET\` and enforce rate limits, budgets and observability.
7. Offer explicit controls: per-channel opt-in/off, critical-only vs early-warning, quiet hours/time zone, digest frequency, test notification and revoke all devices. SMS must be off unless user separately opts into paid messaging.
8. Add integration tests for users changing devices, logouts, lost permissions, per-user authorization, duplicate imports, retry/idempotency and privacy-safe lock screen. Monitor delivery success, not just job execution.

\`\`\`mermaid
flowchart LR
    A[Approved LTC screenshot / card charge] --> B[(Owner Firestore data)]
    B --> C[Trusted Lita evaluator]
    C --> D{New threshold crossing?}
    D -->|No| E[No message]
    D -->|Yes| F[(Idempotent delivery outbox)]
    F --> G[FCM Web Push]
    F --> H[Resend email if opted in]
    G --> I[Device service worker]
    I --> J[Open authenticated LTC card guardrails]
\`\`\`

## Decision

**Do not implement an SMS sender or pretend that the existing browser Notification constructor is background push.** Adopt PWA + FCM first once the Lita backend is configured; email via Resend can be a low-cost optional fallback. No new keys, Firestore rules, PWA push registration or external messaging transport is deployed by this PR. The currently shipped bank alert and its thresholds remain deterministic and available in-app.

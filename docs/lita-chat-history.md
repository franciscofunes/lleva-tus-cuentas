# LITA chat history — Firestore setup and troubleshooting

LITA runs in an iframe served from Vercel. **It does not write directly to Firestore**. Authenticated LTC writes the messages to:

\`users/{firebaseAuthUid}/litaChats/{chatId}\`

History is available to the **same Firebase user account** from other devices after the write is acknowledged by Firestore. Chat messages before the history feature was introduced were not automatically archived; do not promise automatic recovery of earlier conversations.

## Required Firestore rules

The existing \`firestore.rules.portfolio\` in this repository is a **fragment only** and **is not deployed by Netlify**. Check the **active** rules in the Firebase console for the Firebase project configured by \`REACT_APP_PROJECT_ID\`.

If the active rules do not already grant this access, merge this rule within the existing
\`match /databases/{database}/documents\` block, keeping the rest of the production rules intact:

\`\`\`firestore
match /users/{uid}/litaChats/{chatId} {
  allow read, create, update, delete:
    if request.auth != null && request.auth.uid == uid;
}
\`\`\`

**Do not replace the entire production ruleset with the fragment from this repo.** Review and publish the merged rules through Firebase Console/approved deployment. Test in Rules Playground with matching and non-matching authenticated UIDs.

## Verify

1. Log in to LTC, open LITA and send a new message; wait until the reply finishes.
2. The composer must show "Conversación guardada" **only after** LTC receives a successful save result from Firestore.
3. In Firebase Console > Firestore Data, check the authenticated user's \`litaChats\` subcollection for a new chat document.
4. Close/reopen LITA, open History, and verify the saved title appears. Also verify from a second device signed in as the **same user**.
5. Test a denied read/write: the UI should show an actual error and a Retry button, **not** falsely state there are no conversations.
6. If the history is still empty, check whether the messages predate the history feature. Previously unpersisted chat sessions cannot be reconstructed from the new UI.

The iframe protocol uses \`lita:history\`, \`lita:history:status\`, \`lita:history:save\`, and \`lita:history:save:result\`; each save request has a \`requestId\` and is acknowledged only after the asynchronous Firestore write resolves. Do not expose Firebase auth tokens or API keys in \`postMessage\`.

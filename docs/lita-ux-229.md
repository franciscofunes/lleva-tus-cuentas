# Lita UX #229 — host integration and cross-page visual contract

Lita is **two separately deployed applications**:
- LTC React mounts the modal/chat viewport and owns Firebase authentication, Firestore `litaChats` and each financial page's privacy setting.
- `franciscofunes/lita-assitant` renders the Next.js conversation, composer, streaming, history and Markdown. They communicate exclusively using origin-and-source-checked `postMessage`.

The product-wide visual reference is the **actual Transactions screen** and the shared LTC tokens, not an independently styled chat widget. This first phase corrects both repos; it does not change the AI model, Firestore rules or account valuation formulas.

## Host panel
- The floating panel is an accessible labeled modal, styled as an LTC white / opaque slate-800 surface with violet focus rings. Expand and close controls have **44×44 px** hit areas, and the header uses `COLLAPSIBLE_HEADER_STYLES`, consistent with financial widgets.
- On phone widths it docks to the bottom as an 88dvh sheet; on desktop it remains a floating 420–440px chat panel. The existing `visualViewport` keyboard correction, 100dvh expanded mode and **iframe identity** are preserved; reopening restores focus to the originating page control.
- History and context continue to be owner-scoped. The iframe still only receives messages from the LTC host's exact origin and source; no credentials or API keys are exposed.

## Privacy contract
When the *calling page's* **Ocultar importes** toggle is enabled, it passes `privacyHidden` to the Lita panel. LTC sends **only** `{section,scope:'privacy-hidden',privacyHidden:true}`, an empty history collection and status `{state:'unavailable',reason:'privacy-hidden'}`. Historic transaction requests are rejected without querying Firestore. The Lita iframe displays a human-readable privacy explanation and suppresses history Retry while private. To restore analysis, close the panel, reveal balances on the financial page, then reopen it. Already-saved chat content is not deleted.

Privacy suppression applies to Transacciones, Bancos and Portfolio. It changes *what crosses the iframe boundary*, not stored financial values.

## History delete contract
- `lita:history:delete` from the new iframe contains `{id, requestId}`.
- The LTC host checks **both the exact origin and window**, validates the ID/optional request ID, checks signed-in user, then calls `deleteLitaChat(uid,id)`. It responds with `lita:history:delete:result` containing the original request ID, ID, `success` and, if needed, a coarse failure reason.
- The iframe removes the visible thread **only after success**. While pending, buttons are disabled; failed or timed-out writes retain the conversation with an actionable retry. The user's explicit confirmation is required before sending the request.
- **Deployment order:** merge/deploy the LTC host first, then the Lita iframe. Older Lita builds without request IDs are still accepted by the host; new iframe builds need the acknowledgment-capable host.

## Verification
1. `LitaAssitantPanel.test.js`: modal labeling, 44px controls, responsive keyboard dimensions, focus restoration, strict sender origin, confirmed writes, privacy context/history redaction and historical-query blocking.
2. `LitaIframeClipboard.test.js`: maintain clipboard-write delegation only.
3. Lita repo: `tests/lita-ux-consistency.test.mjs` plus Next.js production build.
4. Required but not claimed complete: authenticated side-by-side captures at **390, 1440 and 1728px**, light/dark and Android physical keyboard; focus, iframe scroll and message streaming in the deployed two-repo combination.

See [financial UI contract](financial-ui-contract.md) and [history setup](lita-chat-history.md).

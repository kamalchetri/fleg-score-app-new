# Fix: wire the reg_forms (generic events) payment path

**Problem found in audit.** The app's paid-registration flow (`lib/registration.ts`) posts a
`reg_submissions` id to `/api/payments/razorpay/create-order` + `/verify`, but those routes are
**AIKO/RMLCF-specific** (they use `aikoRepo`, `registrationId`, `recoveryToken`). There is no
create-order / verify route that operates on `reg_submissions`. Result: free events register fine;
**paid events fail**. Fix = add two routes on the **fleg.in web repo** (`Fleg-score`), then repoint the app.

Money is integer INR rupees in `reg_submissions.amount`; Razorpay wants paise (×100).

## 1. New web route — create order  `src/app/api/payments/forms/create-order/route.ts`
Copy the structure of `src/app/api/payments/run/create-order/route.ts` (same repo) and adapt:
- Body: `{ submissionId: string }`.
- Load the submission with the **admin** client: `getSupabaseAdminClient().from('reg_submissions').select('id, form_id, amount, payment_status, hold_expires_at').eq('id', submissionId).single()`.
- Guard: 404 if missing; if `payment_status === 'paid'` return `{ alreadyPaid: true }`; reject if `hold_expires_at` is past.
- Amount must be `> 0` (free events never reach here).
- Create the Razorpay order via the existing `@/lib/server/razorpay` helper: `amount: submission.amount * 100`, `currency: 'INR'`, `receipt: submissionId`.
- Persist `razorpay_order_id` back onto the row.
- Return `{ orderId, amount, currency, keyId }` where `keyId` is the **public** Razorpay key id (never the secret).

## 2. New web route — verify  `src/app/api/payments/forms/verify/route.ts`
Copy `src/app/api/payments/run/verify/route.ts` and adapt:
- Body: `{ submissionId, razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
- Idempotent: if already `paid`, return success.
- Verify with `verifyRazorpaySignature(order_id, payment_id, signature)` from `@/lib/server/razorpay`. On mismatch → 400.
- On success, admin-update `reg_submissions`: `payment_status='paid'`, `status='confirmed'`, `razorpay_payment_id`, `razorpay_signature`, `paid_at=now()`.
- Return the updated submission summary (id, status, amount, currency).

Both routes: no user-auth required (the submission id + server-side signature check are the security
boundary, exactly like the run/darts routes). Keep the Razorpay secret in server env only.

## 3. Repoint the app  `fleg-score-app/lib/registration.ts`
- `CREATE_ORDER = "https://www.fleg.in/api/payments/forms/create-order"`
- `VERIFY = "https://www.fleg.in/api/payments/forms/verify"`
- Send `{ submissionId }` (not `registrationId`). Keep the `openRazorpayCheckout` dynamic import.
- The Bearer header is harmless but unused now; fine to leave or drop.

## Done when
- A paid `reg_forms` event: submit → order created → Razorpay checkout (dev build) → verify flips the
  submission to `paid`/`confirmed`, and the pass screen shows the reference id.
- Free events unchanged. `tsc` clean on both repos.

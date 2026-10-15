# FLEG Razorpay — Supabase Edge Functions setup

Payment backend now lives on Supabase (no web dependency). Three functions are deployed
to project `zcubdqfzdbwtfcdsntoa`:

| Function | URL | Auth |
|---|---|---|
| create order | `https://zcubdqfzdbwtfcdsntoa.supabase.co/functions/v1/forms-create-order` | user JWT |
| verify | `https://zcubdqfzdbwtfcdsntoa.supabase.co/functions/v1/forms-verify` | user JWT |
| webhook | `https://zcubdqfzdbwtfcdsntoa.supabase.co/functions/v1/forms-webhook` | Razorpay signature |

## 1. Set the secrets (YOU — do NOT paste them in chat)
Supabase dashboard → **Project Settings → Edge Functions → Secrets** (or Edge Functions → Manage secrets). Add:
- `RAZORPAY_KEY_ID` — the FLEG account key id (starts `rzp_live_…` or `rzp_test_…`)
- `RAZORPAY_KEY_SECRET` — the FLEG account key secret
- `RAZORPAY_WEBHOOK_SECRET` — a secret you choose; must match the Razorpay webhook config below

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't add them.

## 2. Configure the Razorpay webhook (YOU)
Razorpay dashboard → **Settings → Webhooks → Add New Webhook**:
- **URL:** `https://zcubdqfzdbwtfcdsntoa.supabase.co/functions/v1/forms-webhook`
- **Secret:** the same value you set for `RAZORPAY_WEBHOOK_SECRET`
- **Active events:** `payment.captured` and `order.paid`

## 3. Repoint the app (CURSOR — `fleg-score-app/lib/registration.ts`)
Call the edge functions instead of the fleg.in API. Prefer `supabase.functions.invoke`
so the auth + apikey headers are attached automatically:

```ts
// create order
const { data, error } = await supabase.functions.invoke("forms-create-order", {
  body: { submissionId },
});
// data = { orderId, amount, currency, keyId }  OR  { alreadyPaid: true }

// verify
const { data, error } = await supabase.functions.invoke("forms-verify", {
  body: { submissionId, razorpay_order_id, razorpay_payment_id, razorpay_signature },
});
// data = { success: true, submission } (also handles alreadyVerified)
```
Remove the old `https://www.fleg.in/api/payments/...` constants and the manual Bearer header.
Use `data.keyId` from create-order as the Razorpay checkout key. Keep the dynamic
`react-native-razorpay` import (dev build only).

## What each function does (already deployed, no code change needed)
- **create-order:** loads `reg_submissions`, blocks expired holds, returns `{alreadyPaid}` if already paid,
  else creates a Razorpay order for `amount×100` paise, saves `razorpay_order_id`, returns `{orderId, amount, currency, keyId}`.
- **verify:** idempotent; guards order-id mismatch; verifies the HMAC signature server-side; marks the
  submission `paid`/`confirmed` with payment id + `paid_at`.
- **webhook:** verifies the Razorpay webhook HMAC; on `payment.captured`/`order.paid` flips the matching
  submission to paid — a safety net if the app closed before verify ran.

## Notes
- The old fleg.in `/api/payments/forms/*` routes can be retired once the app is repointed.
- Secrets never touch the app or this repo. Rotating the Razorpay key = update the Supabase secret only.

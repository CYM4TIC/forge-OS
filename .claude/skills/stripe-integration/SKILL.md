---
name: stripe-integration
description: "Use when implementing payment flows, Stripe Connect, subscriptions, webhooks, or any Stripe API integration. Enhances Vane (Financial Architecture)."
risk: safe
source: adapted from Antigravity stripe-integration skill
date_added: 2026-03-31
persona: vane
---

# Stripe Integration Best Practices

> 4 payment flow patterns. Webhook handling. Test methodology.
> Activated automatically when Vane boots on commerce projects.

---

## 1. Payment Flow Patterns

### Hosted Checkout (Stripe Checkout)
```
Best for: Simple one-time payments, subscription signups
Flow: Client → Server creates Session → Redirect to Stripe → Webhook confirms

Server:
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',  // or 'subscription'
    line_items: [{ price: 'price_xxx', quantity: 1 }],
    success_url: 'https://app.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://app.com/cancel',
    metadata: { order_id: '123' },  // always attach business context
  });

Rules:
  - Always include metadata for webhook reconciliation
  - success_url is cosmetic — NEVER fulfill based on it. Wait for webhook.
  - Use {CHECKOUT_SESSION_ID} template for post-checkout verification
```

### Custom Payment Intent (Elements)
```
Best for: Custom UI, complex flows, multi-step checkout
Flow: Server creates PaymentIntent → Client confirms with Elements → Webhook confirms

Server:
  const intent = await stripe.paymentIntents.create({
    amount: 5000,  // in cents
    currency: 'usd',
    metadata: { order_id: '123' },
    idempotency_key: `order_123_attempt_1`,  // CRITICAL for retries
  });

Client:
  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: 'https://app.com/complete' },
  });

Rules:
  - Amount is in smallest currency unit (cents for USD)
  - Always use idempotency keys for PaymentIntent creation
  - Never store full card numbers — Stripe handles PCI compliance
```

### Subscription
```
Best for: Recurring billing, tiered plans
Flow: Create Customer → Attach PaymentMethod → Create Subscription → Webhooks manage lifecycle

Key events:
  - customer.subscription.created → Activate
  - customer.subscription.updated → Plan change
  - customer.subscription.deleted → Deactivate
  - invoice.payment_failed → Grace period / dunning
  - invoice.paid → Renew access

Rules:
  - Always handle invoice.payment_failed (don't ignore failed renewals)
  - Use trial_end for free trials (not custom logic)
  - Use proration_behavior: 'create_prorations' for mid-cycle upgrades
  - Store subscription_id and current_period_end in your database
```

### Stripe Connect (Platform)
```
Best for: Marketplaces, multi-vendor platforms
Modes:
  - Standard: Stripe-hosted onboarding, Stripe dashboard for connected accounts
  - Express: Stripe-hosted onboarding, limited dashboard
  - Custom: You build everything (most work, most control)

Key patterns:
  - Direct charges: Customer pays connected account directly
  - Destination charges: Platform charges, sends funds to connected account
  - Separate charges and transfers: Platform charges, transfers funds later

Rules:
  - Use destination charges for most marketplace patterns
  - Always specify application_fee_amount or transfer_data
  - Store connected account IDs (acct_xxx) in your database
  - Use account.updated webhook to track onboarding status
  - Use OAuth flow for Standard/Express onboarding
```

---

## 2. Webhook Handling

### Implementation
```
1. Verify signature FIRST (before any processing):
   const event = stripe.webhooks.constructEvent(
     body, sig, endpoint_secret
   );

2. Process idempotently:
   - Check if event.id already processed
   - Use database transactions for state changes
   - Make operations safe to retry

3. Respond 200 quickly:
   - Acknowledge receipt before heavy processing
   - Queue async work if processing takes > 5s
   - Stripe retries on non-2xx (up to 3 days)
```

### Critical Events to Handle
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Fulfill order |
| `payment_intent.succeeded` | Update payment status |
| `payment_intent.payment_failed` | Notify customer, retry logic |
| `invoice.paid` | Extend subscription access |
| `invoice.payment_failed` | Start dunning, notify customer |
| `customer.subscription.deleted` | Revoke access |
| `account.updated` | Update connected account status |
| `charge.dispute.created` | Flag for review, gather evidence |

### Rules
- **Always** verify webhook signatures. Never skip in production.
- **Always** process idempotently. Stripe may send the same event multiple times.
- **Never** fulfill orders based on client-side success (success_url, confirmPayment result). Wait for webhook.
- Store the raw event for debugging. Parse and act on the structured data.
- Use separate webhook endpoints for different event groups if processing differs significantly.

---

## 3. Testing

### Test Cards
| Scenario | Card Number |
|----------|-------------|
| Success | `4242 4242 4242 4242` |
| Requires authentication | `4000 0025 0000 3155` |
| Declined | `4000 0000 0000 0002` |
| Insufficient funds | `4000 0000 0000 9995` |
| Expired card | `4000 0000 0000 0069` |
| Processing error | `4000 0000 0000 0119` |

### Test Methodology
1. **Happy path**: Successful payment → webhook → fulfillment
2. **Declined**: Card declined → error message → retry
3. **3D Secure**: Authentication required → complete → webhook
4. **Webhook replay**: Send same event twice → idempotent (no double fulfillment)
5. **Webhook failure**: Endpoint returns 500 → Stripe retries → eventually succeeds
6. **Subscription lifecycle**: Create → renew → fail → grace period → cancel

### Test Mode vs Live Mode
- Use `sk_test_*` keys for development. **Never** use `sk_live_*` in test environments.
- Use Stripe CLI for local webhook testing: `stripe listen --forward-to localhost:3000/webhook`
- Test clock for subscription scenarios: `stripe trigger --test-clock`

---

## 4. Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Not verifying webhooks | Spoofed events → fraudulent fulfillment | Always verify signatures |
| Hardcoded amounts | Price changes require code deploys | Use Stripe Prices/Products |
| Missing idempotency keys | Duplicate charges on retry | Add idempotency_key to all creates |
| Fulfilling on success_url | Race condition — payment may not be complete | Wait for webhook |
| Not handling `payment_failed` | Silent subscription churn | Implement dunning flow |
| Storing card numbers | PCI compliance violation | Use Stripe Elements/Checkout |
| Missing `metadata` | Can't reconcile payments to orders | Always attach business context |
| Not testing webhook retries | Production failures on first retry | Test idempotency explicitly |

---

## 5. Financial Accuracy

### Currency Handling
- **Always** use integer amounts in smallest unit (cents, pence, etc.)
- **Never** use floating point for money calculations
- Be aware of zero-decimal currencies (JPY, KRW) — amount = full value, not cents
- Display formatting: use `Intl.NumberFormat` or Stripe's amount display helpers

### Reconciliation
- Store Stripe's `payment_intent.id`, `charge.id`, and `balance_transaction.id`
- Match webhook amounts against expected amounts (detect partial payments)
- Track refunds separately: `charge.refunded` event → update your records
- For Connect: track application fees and transfers for platform reconciliation

### Tax
- Use Stripe Tax for automatic tax calculation where available
- Store tax amounts separately from base amounts
- Include tax IDs in invoices where required (EU VAT, etc.)

---

## When This Skill Activates

- Vane boots on a project with Stripe in the stack
- Any agent writes payment-related code or webhooks
- Nyx builds checkout, subscription, or billing surfaces
- Systems Triad reviews financial flows
- Wraith tests payment manipulation attacks

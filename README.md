# Routebook — distribution management

A small, single-admin Next.js application for shops, deliveries, payments, and outstanding balances. Existing Firebase web configuration is preserved in `src/lib/firebase-client.ts`. No production Firebase connection has been verified: server credentials must be configured first.

## Firebase setup

1. Open Firebase Console and select **distribution-system-7783a**, the project already configured in the client.
2. Under **Build → Authentication → Get started → Sign-in method**, enable **Email/Password**. Under **Users → Add user**, create the administrator with an email and strong password. Copy this user's **UID**. There is no registration screen in this app; every API only accepts the configured UID.
3. In **Authentication → Settings → Authorized domains**, add `localhost` for local development and your application hostname when deploying.
4. Under **Build → Firestore Database → Create database**, create the default database in production mode and choose a suitable region. If it already exists, use that database. No seed data is required.
5. In **Project settings → Service accounts → Firebase Admin SDK**, generate a private key for this same project. Store the downloaded JSON outside the repository. Copy its `project_id`, `client_email`, and `private_key` into your local environment as described below. Never use `NEXT_PUBLIC_` for these values.
6. Edit the existing `.env.local` manually. `.env.example` lists the required names:

   ```dotenv
   FIREBASE_PROJECT_ID=distribution-system-7783a
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="your-private-key-with-literal-\n-escapes"
   ADMIN_UID=the-administrator-uid
   ```

   Use the exact private key string from the service account JSON, including its BEGIN/END markers. The server converts literal `\n` escapes to newlines. Do not overwrite an existing environment file by copying the example over it. `.env.local` is ignored by Git; `.env.example` contains no credentials.

7. Deploy the rules/configuration to the existing project from this directory:

   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project distribution-system-7783a
   ```

   **These rules deny all direct browser reads and writes to this Firestore database.** This app accesses data exclusively through authenticated server routes. If other apps share this database, review the rules before deploying them. The Admin SDK bypasses Firestore rules, so every API independently verifies the administrator.
8. Run `npm install` if needed, then `npm run dev`. Open `http://localhost:3000/login` and sign in with the administrator credentials. Restart Next.js after changing `.env.local`.

For deployment, use a Node.js-compatible Next.js host and set the same four server environment variables in its private environment settings. This is not a static-export app. Use HTTPS in production. No deployment or remote Firebase changes were performed during implementation.

## Workflows and accounting rules

- Add and edit shops; archive/reactivate instead of deleting their financial history.
- Create a pending delivery with a description, date, and amount. Only active shops can receive new deliveries.
- Mark a delivery delivered through **PATCH `/api/deliveries/[deliveryId]`**. No `/status` endpoint exists. Completing a delivery adds its amount once to its shop's delivered value and outstanding balance. Repeating the same status update has no accounting effect. Delivered entries cannot be reverted.
- Record payments from a shop account. Enter a unique receipt or bank reference for that shop. Reference comparison ignores case and surrounding whitespace. Payments cannot exceed outstanding debt; archived shops can still pay.
- Payments use both a request UUID and a unique shop/receipt-reference record. The payment, reference reservation, and balance update commit in one Firestore transaction. A repeated UUID returns the original result if its payload matches; a different payload or repeated receipt is rejected. A pending browser payment is retained in session storage for retry after a lost response or reload.
- Amounts use integer minor units; all displayed amounts are **LKR**. Per-entry range: 0.01–1,000,000.00. Outstanding = delivered value − payments. Pending deliveries never count as debt. Dashboard totals include archived shops.
- The referenced “main prompt” was not supplied. These explicit rules are the implemented assumptions; there are no refunds, overpayments, delivery reversals, multiple roles, or inventory management.

## Authentication and validation

The Firebase client performs email/password login with session persistence. Every API verifies a Firebase ID token, checks revocation/disabled-user status, and compares the verified UID with server-only `ADMIN_UID`. Client route guards only control presentation; server authorization is authoritative. API responses disable caching. Zod rejects invalid IDs, dates, money values, and unknown write fields. Server exceptions do not expose credentials. Direct Firestore access is denied by `firestore.rules`.

Firebase reference: [ID-token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens) and [atomic transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Checks

```bash
npm run lint
npm test
npm run build
npm run start
```

The build uses Next.js's supported webpack compiler because Turbopack's CSS worker cannot bind its required local port in this workspace environment. The development command remains `next dev`; use `npm run dev -- --webpack` if your environment has the same restriction.

`tests/ledger.test.ts` checks integer money, schemas, repeated completion, repeated payments, conflicting request IDs, duplicate receipts, overpayment, and archived/missing shops using a rollback-capable serialized transaction double. `tests/auth.test.ts` verifies the authorization policy using a mocked token verifier and checks error redaction. These are unit tests, not proof of a live Firebase connection.

`tests/firestore.integration.test.ts` is skipped unless a local Firestore emulator is running. To test actual transaction behavior and the client-deny rules, install a Java runtime supported by Firebase CLI (Java 21 recommended) and run:

```bash
npx firebase-tools emulators:exec --only firestore --project demo-routebook "npm test"
```

The integration test only accepts a localhost emulator and uses the isolated `demo-routebook` project. Java is not installed in the implementation workspace, so this integration test has not been executed here.

After configuring Firebase, manually verify: admin login succeeds; another user's login is refused; create a shop; create a 100.00 pending delivery (balance stays zero); mark delivered (balance becomes 100.00); record a 25.00 payment (balance becomes 75.00); retry the same receipt (no duplicate); reject an 80.00 payment; refresh and verify history and dashboard totals. Sign out and confirm API requests without a token return 401.

This small-scope app currently loads full shop/delivery/payment lists. Add server pagination when data volume warrants it. Shop creation has a submit lock but not persistent idempotency; check the list before resubmitting after an uncertain network failure.

## Supporting files added

- `src/components/auth-provider.tsx`: authentication lifecycle and protected UI.
- `src/lib/api-client.ts`, `api-server.ts`, `use-resource.ts`: token-bearing requests, safe JSON/error responses, and loading/retry state.
- `src/lib/ledger.ts`, `money.ts`: reusable transaction logic and exact minor-unit arithmetic, isolated for tests.
- `src/components/data-state.tsx`, `delivery-list.tsx`: shared loading/errors and delivery status controls.
- `src/components/ui/button.tsx`, `input.tsx`, `src/lib/utils.ts`, `components.json`: local shadcn-style primitives and configuration; no shadcn components existed previously.
- `.env.example`: safe environment template.
- `firebase.json`, `firestore.indexes.json`: rules deployment and emulator configuration; current queries only need automatic single-field indexes.
- `tests/*.test.ts`: ledger, authorization, and optional emulator checks.

Added missing Firebase Admin SDK, server-only boundary, Sonner toast, Radix Slot/CVA/class utilities, and the tsx test runner. Existing Firebase, Zod, Tailwind, TypeScript, and Next.js were retained. The `@/*` import alias now points to `src/*`.

## Dependency audit

At implementation time, `npm audit --omit=dev` reported eight moderate dependency findings in the Firebase Admin transitive dependency chain, rooted in an older UUID package. No forced major-version downgrade was applied. Review upstream updates before production deployment.

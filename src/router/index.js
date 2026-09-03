import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    // The marketing landing page - what a signed-out visitor sees at the
    // root URL. Signed-in users are bounced straight to their dashboard by
    // the guard below, so this only ever renders for guests.
    path: '/',
    name: 'landing',
    component: () => import('../views/Landing.vue'),
  },
  {
    // The actual app now lives under /dashboard, /invoices, etc. rather
    // than claiming the bare "/" - that's the landing page's job now. Only
    // dashboard's own path changed (from '' to 'dashboard'); every other
    // child route and every internal link already navigates by route
    // `name` rather than a hardcoded path, so this move needed no other
    // changes.
    path: '/',
    component: () => import('../layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/DashboardHome.vue') },
      { path: 'invoices', name: 'invoices', component: () => import('../views/InvoiceList.vue') },
      { path: 'invoices/new', name: 'invoice-create', component: () => import('../views/InvoiceCreate.vue') },
      { path: 'invoices/:code', name: 'invoice-detail', component: () => import('../views/InvoiceDetail.vue') },
      { path: 'recurring-invoices', name: 'recurring-invoices', component: () => import('../views/RecurringInvoiceList.vue') },
      { path: 'recurring-invoices/new', name: 'recurring-invoice-create', component: () => import('../views/RecurringInvoiceCreate.vue') },
      { path: 'quotes', name: 'quotes', component: () => import('../views/QuoteList.vue') },
      { path: 'quotes/new', name: 'quote-create', component: () => import('../views/QuoteCreate.vue') },
      { path: 'quotes/:code', name: 'quote-detail', component: () => import('../views/QuoteDetail.vue') },
      { path: 'expenses', name: 'expenses', component: () => import('../views/ExpenseList.vue') },
      { path: 'expenses/:code', name: 'expense-detail', component: () => import('../views/ExpenseDetail.vue') },
      { path: 'spending', name: 'spending', component: () => import('../views/SpendList.vue') },
      { path: 'customers', name: 'customers', component: () => import('../views/CustomerList.vue') },
      { path: 'customers/:code', name: 'customer-detail', component: () => import('../views/CustomerDetail.vue') },
      { path: 'inventory', name: 'inventory', component: () => import('../views/Inventory.vue') },
      { path: 'bank-accounts', name: 'bank-accounts', component: () => import('../views/BankAccounts.vue') },
      { path: 'templates', name: 'templates', component: () => import('../views/TemplateGallery.vue') },
      { path: 'billing', name: 'billing', component: () => import('../views/Billing.vue') },
      { path: 'settings', name: 'settings', component: () => import('../views/BusinessSettings.vue') },
    ],
  },
  {
    path: '/',
    component: () => import('../layouts/AuthLayout.vue'),
    meta: { guestOnly: true },
    children: [
      { path: 'sign-in', name: 'sign-in', component: () => import('../views/SignIn.vue') },
      { path: 'sign-up', name: 'sign-up', component: () => import('../views/SignUp.vue') },
      { path: 'forgot-password', name: 'forgot-password', component: () => import('../views/ForgotPassword.vue') },
      { path: 'reset-password/:token', name: 'reset-password', component: () => import('../views/ResetPassword.vue') },
    ],
  },
  {
    // Matches the link in the welcome email: `${APP_URL}/verify-email/${token}`.
    // Public, no auth - the visitor may not be signed in on this device
    // (see VerifyEmail.vue, which handles both cases).
    path: '/verify-email/:token',
    name: 'verify-email',
    component: () => import('../views/VerifyEmail.vue'),
  },
  {
    // Where PAYSTACK_CALLBACK_URL points - Paystack redirects the
    // customer's browser here after checkout, with `reference`/`trxref` as
    // query params (see PaymentCallback.vue). This is a *static* path
    // segment, so Vue Router ranks it above the dynamic `/payment/:code`
    // route below regardless of declaration order - without a route
    // registered here at all, `/payment/callback` would otherwise match
    // that dynamic route instead, with "callback" wrongly treated as an
    // invoice number (which is exactly what used to happen - see
    // PaymentCallback.vue's own comment on the shape of that bug).
    path: '/payment/callback',
    name: 'payment-callback',
    component: () => import('../views/PaymentCallback.vue'),
  },
  {
    // Matches the payment link the backend embeds in every invoice
    // email/PDF: `${APP_URL}/payment/${invoiceNumber}`. Public, no auth.
    path: '/payment/:code',
    name: 'public-invoice',
    component: () => import('../views/PublicInvoice.vue'),
  },
  {
    // Matches the quote link the backend embeds in every quote email:
    // `${APP_URL}/quote/${quoteNumber}`. Deliberately singular ("quote", not
    // "quotes") so it can't collide with the authenticated dashboard route
    // at /quotes/:code above - same reasoning as /payment/:code being a
    // distinct path from /invoices/:code rather than reusing it. Public, no
    // auth - this is what a customer clicks from their email.
    path: '/quote/:code',
    name: 'public-quote',
    component: () => import('../views/PublicQuote.vue'),
  },
  {
    // Matches the link the backend emails a vendor when a business requests
    // their payment details: `${APP_URL}/pay-expense/${code}`. Public, no
    // auth - the vendor has no invoecr account, they're just filling in
    // where to send money. Deliberately its own top-level path (not nested
    // under the authenticated /expenses routes) for the same reason
    // /payment/:code and /quote/:code are separate from their authenticated
    // counterparts.
    path: '/pay-expense/:code',
    name: 'pay-expense',
    component: () => import('../views/PayExpense.vue'),
  },
  {
    // Matches the link in an accountant-invite email:
    // `${APP_URL}/accept-accountant-invite/${token}`. No `requiresAuth` -
    // the page itself handles both the signed-out (prompt to sign in/up,
    // preserving this URL via ?redirect=) and signed-in (show an Accept
    // button) cases. See accountant.service.js/AcceptAccountantInvite.vue.
    path: '/accept-accountant-invite/:token',
    name: 'accept-accountant-invite',
    component: () => import('../views/AcceptAccountantInvite.vue'),
  },
  {
    // The root panel - not a separate auth domain. It's gated by the same
    // sign-in/JWT as the rest of the app (meta.requiresAuth below), plus
    // meta.requiresRoot, which the guard checks against
    // auth.entity?.isRoot - a server-computed flag (see
    // EntityService.getMe) that's only true when this account's email is
    // on the backend's ROOT_ADMIN_EMAILS allowlist. A different layout
    // (RootLayout, red not lilac) so it's visually unmistakable which mode
    // you're in, but the same token, the same store, the same session.
    path: '/root',
    component: () => import('../layouts/RootLayout.vue'),
    meta: { requiresAuth: true, requiresRoot: true },
    children: [
      { path: '', name: 'root-merchants', component: () => import('../views/RootMerchantList.vue') },
      { path: 'merchants/:code', name: 'root-merchant-detail', component: () => import('../views/RootMerchantDetail.vue') },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'sign-in', query: { redirect: to.fullPath } }
  }
  // Landing page behaves like a guestOnly route without needing its own
  // meta flag: a signed-in visitor landing on "/" (e.g. a bookmark, or
  // typing the bare domain) means straight to their dashboard, not the
  // marketing pitch.
  if ((to.meta.guestOnly || to.name === 'landing') && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  // Root panel - client-side convenience only, the real gate is the
  // backend's Authorization.requireRoot on every /admin/* call. But
  // `auth.entity` here can be a stale snapshot from localStorage (sign-in's
  // response never carries `isRoot` - only GET /entity/me computes it), so
  // a direct visit/refresh on /root would otherwise bounce a genuine root
  // account away before AppSidebar's own refresh has had a chance to run.
  // Fetch a fresh entity right here instead of trusting the cache, but only
  // on this branch - every other navigation stays synchronous.
  if (to.meta.requiresRoot && auth.entity?.isRoot !== true) {
    await auth.refreshEntity().catch(() => null)
    if (auth.entity?.isRoot !== true) {
      return { name: 'dashboard' }
    }
  }

  return true
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    component: () => import('../layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('../views/DashboardHome.vue') },
      { path: 'invoices', name: 'invoices', component: () => import('../views/InvoiceList.vue') },
      { path: 'invoices/new', name: 'invoice-create', component: () => import('../views/InvoiceCreate.vue') },
      { path: 'invoices/:code', name: 'invoice-detail', component: () => import('../views/InvoiceDetail.vue') },
      { path: 'quotes', name: 'quotes', component: () => import('../views/QuoteList.vue') },
      { path: 'quotes/new', name: 'quote-create', component: () => import('../views/QuoteCreate.vue') },
      { path: 'quotes/:code', name: 'quote-detail', component: () => import('../views/QuoteDetail.vue') },
      { path: 'customers', name: 'customers', component: () => import('../views/CustomerList.vue') },
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
    ],
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
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'sign-in', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  return true
})

export default router

<script setup>
const plans = [
  {
    name: 'Free',
    price: '₦0',
    period: 'forever',
    blurb: 'For testing the waters.',
    features: ['2 invoices a month', 'Paystack payment links', 'Basic invoice template'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Growth',
    price: '₦4,500',
    period: '/month',
    blurb: 'For a business sending invoices every week.',
    features: ['20 invoices a month', 'Email + WhatsApp payment reminders', 'Premium invoice templates', 'Proforma invoices & quotes'],
    cta: 'Start with Growth',
    featured: true,
  },
  {
    name: 'Business',
    price: '₦15,000',
    period: '/month',
    blurb: 'For a business that never wants to think about limits.',
    features: ['Unlimited invoices', 'Everything in Growth', 'Inventory & stock tracking', 'Accountant/bookkeeper access'],
    cta: 'Start with Business',
    featured: false,
  },
]

const features = [
  {
    title: 'Invoices customers actually pay',
    body: 'Send a professional invoice with a Paystack payment link built in — by card, bank transfer, or USSD — so getting paid is one tap for your customer.',
    icon: 'M9 14l6-6m-5.5-.5h.01M16 9h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'Reminders that chase for you',
    body: "Invoecr nudges customers by email and WhatsApp as a due date approaches, and again if it slips — so you're not the one sending awkward follow-up texts.",
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
  {
    title: 'Quotes that turn into invoices',
    body: 'Send a proforma invoice to close the deal, then convert it into a real invoice with one click once the customer says yes — no re-typing line items.',
    icon: 'M9 12h6m-6 4h4m-7 8l3-3h9a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v11z',
  },
  {
    title: 'Stock that keeps itself honest',
    body: "Link invoice line items to your inventory and watch stock levels update as you sell, so you're never invoicing for something you don't have.",
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    title: 'Room for your accountant',
    body: 'Invite your accountant or bookkeeper to manage your books directly — they get their own login and a workspace switcher, you keep full control.',
    icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M7 8a4 4 0 108 0 4 4 0 00-8 0z',
  },
  {
    title: 'Built for where FIRS is heading',
    body: "Nigeria's e-invoicing mandate is rolling out to small businesses over the next couple of years — Invoecr is built to keep you compliant when it reaches you.",
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
]

const steps = [
  { title: 'Create an invoice', body: 'Add your customer and line items — or convert an accepted quote — in under a minute.' },
  { title: 'Send it', body: 'Your customer gets a professional PDF by email with a payment link. No app to install, no account to create.' },
  { title: 'Get paid, get reminded', body: 'Payments land straight in your bank. If one goes quiet, Invoecr follows up automatically so you don\'t have to.' },
]
</script>

<template>
  <div class="bg-white">
    <!-- Nav -->
    <header class="border-b border-ink-100">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-lilac-600 text-sm font-bold text-white">
            In
          </div>
          <span class="text-sm font-semibold text-ink-900">Invoecr</span>
        </div>
        <nav class="flex items-center gap-2">
          <router-link :to="{ name: 'sign-in' }" class="btn-ghost">Sign in</router-link>
          <router-link :to="{ name: 'sign-up' }" class="btn-primary">Get started free</router-link>
        </nav>
      </div>
    </header>

    <!-- Hero -->
    <section class="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-24 sm:pt-24">
      <div class="mx-auto max-w-2xl text-center">
        <h1 class="text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
          Invoice, get paid, and stop chasing customers for money
        </h1>
        <p class="mt-5 text-base leading-relaxed text-ink-500 sm:text-lg">
          Invoecr is invoicing software built around how Nigerian SMEs actually get paid — Paystack links,
          automatic email &amp; WhatsApp reminders, and quotes that convert into invoices with one click.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <router-link :to="{ name: 'sign-up' }" class="btn-primary px-5 py-2.5 text-base">
            Get started free
          </router-link>
          <router-link :to="{ name: 'sign-in' }" class="btn-secondary px-5 py-2.5 text-base">
            Sign in
          </router-link>
        </div>
        <p class="mt-4 text-xs text-ink-400">No card required to start. 2 free invoices every month, forever.</p>
      </div>

      <!-- Simple product mockup - a stylised invoice card, not a screenshot,
           so this page has no external image asset to keep in sync. -->
      <div class="mx-auto mt-16 max-w-lg">
        <div class="card p-6">
          <div class="flex items-start justify-between border-b border-ink-100 pb-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-ink-400">Invoice</p>
              <p class="mt-1 text-sm font-semibold text-ink-900">INV-0148 &middot; Adaeze Foods</p>
            </div>
            <span class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Sent</span>
          </div>
          <div class="mt-4 space-y-2">
            <div class="flex justify-between text-sm text-ink-600">
              <span>Jollof rice (party pack) &times; 3</span>
              <span>₦45,000</span>
            </div>
            <div class="flex justify-between text-sm text-ink-600">
              <span>Delivery</span>
              <span>₦3,000</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
            <span class="text-sm font-medium text-ink-900">Balance due</span>
            <span class="text-lg font-semibold text-ink-900">₦48,000</span>
          </div>
          <div class="mt-4 flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
            <svg class="h-4 w-4 shrink-0 text-lilac-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Reminder scheduled &middot; due in 3 days
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="border-t border-ink-100 bg-ink-50 py-20">
      <div class="mx-auto max-w-6xl px-6">
        <div class="mx-auto max-w-xl text-center">
          <h2 class="text-2xl font-semibold text-ink-900 sm:text-3xl">Everything after "send invoice"</h2>
          <p class="mt-3 text-sm text-ink-500 sm:text-base">
            Most invoicing tools stop at the PDF. Invoecr keeps working after you hit send.
          </p>
        </div>
        <div class="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="f in features" :key="f.title" class="card p-6">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-lilac-50 text-lilac-600">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" :d="f.icon" />
              </svg>
            </div>
            <h3 class="mt-4 text-sm font-semibold text-ink-900">{{ f.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-ink-500">{{ f.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="py-20">
      <div class="mx-auto max-w-6xl px-6">
        <div class="mx-auto max-w-xl text-center">
          <h2 class="text-2xl font-semibold text-ink-900 sm:text-3xl">Three steps, then it runs itself</h2>
        </div>
        <div class="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div v-for="(s, i) in steps" :key="s.title" class="text-center">
            <div class="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-lilac-600 text-sm font-semibold text-white">
              {{ i + 1 }}
            </div>
            <h3 class="mt-4 text-sm font-semibold text-ink-900">{{ s.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-ink-500">{{ s.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="border-t border-ink-100 bg-ink-50 py-20">
      <div class="mx-auto max-w-6xl px-6">
        <div class="mx-auto max-w-xl text-center">
          <h2 class="text-2xl font-semibold text-ink-900 sm:text-3xl">Simple pricing, in naira</h2>
          <p class="mt-3 text-sm text-ink-500 sm:text-base">Start free. Upgrade only when you're sending enough invoices to need it.</p>
        </div>
        <div class="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div
            v-for="plan in plans"
            :key="plan.name"
            class="card flex flex-col p-6"
            :class="plan.featured ? 'border-lilac-300 ring-1 ring-lilac-300' : ''"
          >
            <p v-if="plan.featured" class="mb-2 text-xs font-medium uppercase tracking-wide text-lilac-600">Most popular</p>
            <h3 class="text-sm font-semibold text-ink-900">{{ plan.name }}</h3>
            <p class="mt-3 flex items-baseline gap-1">
              <span class="text-3xl font-semibold text-ink-900">{{ plan.price }}</span>
              <span class="text-sm text-ink-400">{{ plan.period }}</span>
            </p>
            <p class="mt-2 text-sm text-ink-500">{{ plan.blurb }}</p>
            <ul class="mt-5 flex-1 space-y-2.5">
              <li v-for="feat in plan.features" :key="feat" class="flex items-start gap-2 text-sm text-ink-600">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-lilac-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {{ feat }}
              </li>
            </ul>
            <router-link
              :to="{ name: 'sign-up' }"
              class="mt-6 w-full"
              :class="plan.featured ? 'btn-primary' : 'btn-secondary'"
            >
              {{ plan.cta }}
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="py-20">
      <div class="mx-auto max-w-3xl px-6 text-center">
        <h2 class="text-2xl font-semibold text-ink-900 sm:text-3xl">Send your next invoice in under 5 minutes</h2>
        <p class="mt-3 text-sm text-ink-500 sm:text-base">No setup calls, no card details. Just create an account and start.</p>
        <router-link :to="{ name: 'sign-up' }" class="btn-primary mt-6 inline-flex px-5 py-2.5 text-base">
          Get started free
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-ink-100 py-10">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-md bg-lilac-600 text-xs font-bold text-white">
            In
          </div>
          <span class="text-sm font-medium text-ink-700">Invoecr</span>
        </div>
        <p class="text-xs text-ink-400">&copy; {{ new Date().getFullYear() }} Invoecr. Invoicing built for Nigerian SMEs.</p>
        <div class="flex items-center gap-4 text-xs text-ink-500">
          <router-link :to="{ name: 'sign-in' }" class="hover:text-ink-800">Sign in</router-link>
          <router-link :to="{ name: 'sign-up' }" class="hover:text-ink-800">Sign up</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

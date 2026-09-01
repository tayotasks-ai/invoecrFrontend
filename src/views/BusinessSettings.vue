<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
onMounted(() => {
  auth.refreshEntity().catch(() => null)
})

// Accountant/bookkeeper access is a Business-plan feature (see backend
// config/plans.js). Access already granted stays visible/revocable
// regardless of plan (see AccountantService.revokeAccess, which has no
// plan check) - only sending a *new* invite is gated, same "viewing stays,
// creating is gated" pattern as Quotes/Inventory. Strictly `=== true` so
// this starts hidden rather than flashing on before planDetails has loaded.
const allowAccountantAccess = computed(() => auth.entity?.planDetails?.allowAccountantAccess === true)

const profile = ref({
  phone: auth.entity?.phone || '',
  address: auth.entity?.address || '',
  tin: auth.entity?.tin || '',
})
const savingProfile = ref(false)
const profileMessage = ref('')

async function saveProfile() {
  savingProfile.value = true
  profileMessage.value = ''
  try {
    await api.patch('/entity', profile.value)
    await auth.refreshEntity().catch(() => null)
    profileMessage.value = 'Saved.'
  } catch (e) {
    profileMessage.value = e.message
  } finally {
    savingProfile.value = false
  }
}

// Payment reminders (email + WhatsApp) - a single business-wide on/off
// switch covering both channels (individual reminders can still be sent
// manually from an invoice regardless). Saves immediately on toggle rather
// than needing the form's "Save changes".
//
// Deliberately still named `whatsappRemindersEnabled` on the backend model
// even though it now also gates email reminders - renaming the field would
// mean a migration for zero user-facing benefit, since this UI is the only
// place that reads/writes it. Naming debt, not a bug.
const whatsappRemindersEnabled = ref(auth.entity?.whatsappRemindersEnabled !== false)
const savingReminders = ref(false)
async function toggleWhatsappReminders() {
  savingReminders.value = true
  try {
    await api.patch('/entity', { whatsappRemindersEnabled: whatsappRemindersEnabled.value })
    await auth.refreshEntity().catch(() => null)
  } catch (e) {
    whatsappRemindersEnabled.value = !whatsappRemindersEnabled.value // revert on failure
  } finally {
    savingReminders.value = false
  }
}

const logoUrl = ref(auth.entity?.logo || '')
const signatureUrl = ref(auth.entity?.signature || '')
const uploadingLogo = ref(false)
const uploadingSignature = ref(false)
const uploadError = ref('')

// Logos/signatures are stored as base64 data: URIs on the entity document
// (see EntityService._fileToDataUri) rather than uploaded to a third-party
// image host, so app.js caps the upload at 2MB - checked here too, so a
// too-large file doesn't waste a round trip just to be rejected server-side.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
async function uploadFile(field, file) {
  uploadError.value = ''
  if (file.size > MAX_IMAGE_BYTES) {
    uploadError.value = 'That file is too large - the maximum size is 2MB.'
    return
  }
  const formData = new FormData()
  formData.append('file', file)
  const endpoint = field === 'logo' ? '/entity/add-logo' : '/entity/add-signature'
  try {
    const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (field === 'logo') logoUrl.value = res.data.logo
    else signatureUrl.value = res.data.signature
  } catch (e) {
    uploadError.value = e.message
  }
}

async function onLogoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadingLogo.value = true
  await uploadFile('logo', file)
  uploadingLogo.value = false
}
async function onSignatureChange(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadingSignature.value = true
  await uploadFile('signature', file)
  uploadingSignature.value = false
}

// Accountants/bookkeepers - see accountant.service.js. Shown regardless of
// whether this account is currently acting as its own business or as a
// client (an accountant with access can invite a co-accountant on the
// client's behalf too) - api.js/auth store already point every request at
// whichever business is currently active.
const accountants = ref([])
const loadingAccountants = ref(true)
async function loadAccountants() {
  loadingAccountants.value = true
  try {
    const res = await api.get('/entity/accountants')
    accountants.value = res.data || []
  } catch {
    accountants.value = []
  } finally {
    loadingAccountants.value = false
  }
}
loadAccountants()

const accountantEmail = ref('')
const invitingAccountant = ref(false)
const accountantError = ref('')
const lastInviteLink = ref('')
async function inviteAccountant() {
  accountantError.value = ''
  invitingAccountant.value = true
  lastInviteLink.value = ''
  try {
    const res = await api.post('/entity/accountants/invite', { email: accountantEmail.value })
    lastInviteLink.value = res.data.inviteLink
    accountantEmail.value = ''
    await loadAccountants()
  } catch (e) {
    accountantError.value = e.message
  } finally {
    invitingAccountant.value = false
  }
}

async function revokeAccountant(access) {
  if (!confirm(`Remove ${access.accountant?.name || access.invitedEmail}'s access to your books?`)) return
  try {
    await api.delete(`/entity/accountants/${access._id}`)
    await loadAccountants()
  } catch (e) {
    accountantError.value = e.message
  }
}

async function copyInviteLink() {
  await navigator.clipboard.writeText(lastInviteLink.value)
}

// Virtual account (Expenses / Accounts Payable) - activates a dedicated
// bank account for this business via Seerbit. Provisioning only: paying
// vendors automatically from it isn't built yet, so the copy below is
// careful not to promise that. Read straight off auth.entity (refreshed
// after a successful activation) rather than a separate fetch, same
// pattern as logo/signature above.
const virtualAccount = computed(() => auth.entity?.virtualAccount || null)
const vaBvn = ref('')
const vaBusy = ref(false)
const vaError = ref('')

async function activateVirtualAccount() {
  vaError.value = ''
  vaBusy.value = true
  try {
    await api.post('/entity/virtual-account', { bankVerificationNumber: vaBvn.value })
    vaBvn.value = ''
    await auth.refreshEntity().catch(() => null)
  } catch (e) {
    vaError.value = e.message
  } finally {
    vaBusy.value = false
  }
}

const staffForm = ref({ first_name: '', last_name: '', email: '', type: 'staff' })
const invitingStaff = ref(false)
const staffError = ref('')
const invitedCredentials = ref(null)

async function addStaff() {
  staffError.value = ''
  invitingStaff.value = true
  invitedCredentials.value = null
  try {
    const res = await api.post('/entity/add-member', staffForm.value)
    invitedCredentials.value = { email: staffForm.value.email, tempPassword: res.data.tempPassword }
    staffForm.value = { first_name: '', last_name: '', email: '', type: 'staff' }
  } catch (e) {
    staffError.value = e.message
  } finally {
    invitingStaff.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <h1 class="text-lg font-semibold text-ink-900">Business settings</h1>

    <!-- Profile -->
    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">Business profile</h2>
      <form class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" @submit.prevent="saveProfile">
        <div>
          <label class="label">Phone</label>
          <input v-model="profile.phone" class="input" />
        </div>
        <div>
          <label class="label">Address</label>
          <input v-model="profile.address" class="input" />
        </div>
        <div>
          <label class="label">Tax Identification Number (TIN)</label>
          <input v-model="profile.tin" class="input" placeholder="e.g. 12345678-0001" />
        </div>
        <div class="sm:col-span-2 flex items-center gap-3">
          <button type="submit" class="btn-primary" :disabled="savingProfile">{{ savingProfile ? 'Saving…' : 'Save changes' }}</button>
          <span class="text-sm text-ink-400">{{ profileMessage }}</span>
        </div>
      </form>
    </section>

    <!-- Branding -->
    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">Branding</h2>
      <p class="mt-1 text-sm text-ink-400">Your logo and signature appear on every invoice PDF you send.</p>

      <div class="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p class="label">Logo</p>
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="mb-2 h-16 rounded-md border border-ink-100 object-contain p-1" />
          <input type="file" accept="image/*" class="text-sm text-ink-500" :disabled="uploadingLogo" @change="onLogoChange" />
          <p v-if="uploadingLogo" class="mt-1 text-xs text-ink-400">Uploading…</p>
        </div>
        <div>
          <p class="label">Signature</p>
          <img v-if="signatureUrl" :src="signatureUrl" alt="Signature" class="mb-2 h-16 rounded-md border border-ink-100 object-contain p-1" />
          <input type="file" accept="image/*" class="text-sm text-ink-500" :disabled="uploadingSignature" @change="onSignatureChange" />
          <p v-if="uploadingSignature" class="mt-1 text-xs text-ink-400">Uploading…</p>
        </div>
      </div>
      <p v-if="uploadError" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ uploadError }}</p>
    </section>

    <!-- Payment reminders -->
    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">Payment reminders</h2>
      <p class="mt-1 text-sm text-ink-400">
        Automatically nudge customers by email and WhatsApp as an invoice's due date approaches, and again if it
        goes overdue. Email works as soon as it's set up - WhatsApp also requires a Termii account. You can also
        send a reminder for any single invoice manually from its detail page.
      </p>
      <label class="mt-4 flex items-center gap-3 text-sm text-ink-700">
        <input
          v-model="whatsappRemindersEnabled"
          type="checkbox"
          class="rounded border-ink-300 text-lilac-600 focus:ring-lilac-400"
          :disabled="savingReminders"
          @change="toggleWhatsappReminders"
        />
        Send automatic payment reminders for this business
      </label>
    </section>

    <!-- Virtual account (Expenses / Accounts Payable) -->
    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">Virtual account for paying vendors</h2>
      <p class="mt-1 text-sm text-ink-400">
        Activate a dedicated bank account for this business, powered by our banking partner Seerbit, so the vendor
        payments you owe (see Expenses) can settle somewhere real. This only activates the account for now -
        automatic payouts from it aren't available yet, so you'll still send transfers yourself and mark expenses
        as paid from the Expenses page.
      </p>

      <div v-if="virtualAccount?.status === 'active'" class="mt-4 rounded-md bg-emerald-50 p-3 text-sm">
        <p class="text-xs font-medium uppercase tracking-wide text-emerald-700">Active</p>
        <p class="mt-1 text-emerald-900">{{ virtualAccount.accountName }}</p>
        <p class="text-emerald-800">{{ virtualAccount.accountNumber }} &middot; {{ virtualAccount.bankName }}</p>
      </div>

      <template v-else>
        <p v-if="virtualAccount?.status === 'failed'" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          Last attempt didn't go through: {{ virtualAccount.error }}. You can try again below.
        </p>
        <form class="mt-4 flex flex-wrap items-end gap-2" @submit.prevent="activateVirtualAccount">
          <div class="min-w-[12rem] flex-1">
            <label class="label">Bank Verification Number (BVN)</label>
            <input
              v-model="vaBvn"
              class="input"
              inputmode="numeric"
              maxlength="11"
              placeholder="11-digit BVN"
              required
            />
          </div>
          <button type="submit" class="btn-primary flex-none" :disabled="vaBusy || vaBvn.length !== 11">
            {{ vaBusy ? 'Activating…' : 'Activate virtual account' }}
          </button>
        </form>
        <p class="mt-2 text-xs text-ink-400">
          Your BVN is sent directly to Seerbit to open the account - invoecr never stores it.
        </p>
        <p v-if="vaError" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ vaError }}</p>
      </template>
    </section>

    <!-- FIRS e-invoicing compliance -->
    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">FIRS e-invoicing compliance</h2>
      <p class="mt-1 text-sm text-ink-400">
        Nigeria's FIRS e-invoicing mandate is being phased in by business size: large taxpayers are already
        required to comply, medium businesses (₦1-5B turnover) from July 2026, and small businesses like most of
        invoecr's customers from July 2027. Your TIN above is collected ahead of time so nothing blocks you once
        submission goes live.
      </p>
      <div class="mt-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <span class="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
        Not yet connected — we're evaluating accredited e-invoicing partners. Your invoices are not currently submitted to FIRS.
      </div>
    </section>

    <!-- Staff -->
    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">Invite a staff member</h2>
      <form class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" @submit.prevent="addStaff">
        <input v-model="staffForm.first_name" placeholder="First name" class="input" required />
        <input v-model="staffForm.last_name" placeholder="Last name" class="input" required />
        <input v-model="staffForm.email" type="email" placeholder="Email" class="input" required />
        <div class="sm:col-span-3">
          <button type="submit" class="btn-primary" :disabled="invitingStaff">{{ invitingStaff ? 'Inviting…' : 'Invite staff member' }}</button>
        </div>
      </form>

      <p v-if="staffError" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ staffError }}</p>
      <div v-if="invitedCredentials" class="mt-3 rounded-md bg-lilac-50 px-3 py-2 text-sm text-lilac-800">
        Invited <strong>{{ invitedCredentials.email }}</strong> - we've emailed them this temporary password too, but
        here it is in case that email doesn't arrive:
        <span class="font-mono">{{ invitedCredentials.tempPassword }}</span>
      </div>
    </section>

    <!-- Accountants/bookkeepers -->
    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">Accountants &amp; bookkeepers</h2>
      <p class="mt-1 text-sm text-ink-400">
        Give an accountant or bookkeeper access to your books without sharing your login. Once they accept, they can
        switch into your business from their own invoecr account.
      </p>

      <div v-if="!allowAccountantAccess" class="mt-4 rounded-md bg-lilac-50 px-3 py-2.5 text-sm text-lilac-800">
        Inviting an accountant or bookkeeper is a Business-plan feature.
        <router-link :to="{ name: 'billing' }" class="font-semibold underline">Upgrade your plan</router-link>
        to send an invite.
      </div>
      <form v-else class="mt-4 flex flex-wrap gap-2" @submit.prevent="inviteAccountant">
        <input v-model="accountantEmail" type="email" placeholder="Their email address" class="input flex-1" required />
        <button type="submit" class="btn-primary" :disabled="invitingAccountant">
          {{ invitingAccountant ? 'Inviting…' : 'Send invite' }}
        </button>
      </form>
      <p v-if="accountantError" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ accountantError }}</p>
      <div v-if="lastInviteLink" class="mt-3 rounded-md bg-lilac-50 px-3 py-2 text-sm text-lilac-800">
        Invite sent (if email is configured) — you can also share this link directly:
        <div class="mt-1 flex items-center gap-2">
          <span class="truncate font-mono text-xs">{{ lastInviteLink }}</span>
          <button type="button" class="btn-ghost shrink-0 px-2 text-xs" @click="copyInviteLink">Copy</button>
        </div>
      </div>

      <div v-if="!loadingAccountants && accountants.length" class="mt-4 divide-y divide-ink-100 border-t border-ink-100">
        <div v-for="a in accountants" :key="a._id" class="flex items-center justify-between py-2.5 text-sm">
          <div>
            <p class="text-ink-700">{{ a.accountant?.name || a.invitedEmail }}</p>
            <p class="text-xs text-ink-400">{{ a.accountant?.email || a.invitedEmail }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="a.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
            >
              {{ a.status === 'active' ? 'Active' : 'Pending' }}
            </span>
            <button class="btn-ghost px-2 text-xs text-red-500 hover:bg-red-50" @click="revokeAccountant(a)">Remove</button>
          </div>
        </div>
      </div>
      <p v-else-if="!loadingAccountants" class="mt-4 text-sm text-ink-400">No one has access to your books yet.</p>
    </section>
  </div>
</template>

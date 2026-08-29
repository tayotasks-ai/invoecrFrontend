import { defineStore } from 'pinia'
import api from '../lib/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('invoecr_token') || null,
    entity: JSON.parse(localStorage.getItem('invoecr_entity') || 'null'),
    // Client businesses this account has accepted an accountant invite for
    // (see accountant.service.js) - populated by loadMyBusinesses(), used
    // by the AppSidebar workspace switcher. Empty for the overwhelming
    // majority of accounts that have never been invited as an accountant.
    myBusinesses: [],
    // The business _id currently being acted-as, or null when acting as
    // your own account (the default/common case). api.js reads this same
    // localStorage key directly (see its comment) to attach the
    // `x-business-id` header api.js sends on every request - see
    // authorization.service.js's authenticateToken for how the backend
    // enforces it.
    activeWorkspaceId: localStorage.getItem('invoecr_workspace_id') || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    businessName: (state) => state.entity?.name || 'Your business',
    // True once acting as a client business rather than your own account -
    // drives the "you're viewing X's books" banner elsewhere in the UI.
    isActingAsClient: (state) => !!state.activeWorkspaceId,
    activeWorkspace: (state) =>
      state.myBusinesses.find((m) => m.business?._id === state.activeWorkspaceId)?.business || null,
  },
  actions: {
    _persist({ token, entity }) {
      this.token = token
      this.entity = entity
      localStorage.setItem('invoecr_token', token)
      localStorage.setItem('invoecr_entity', JSON.stringify(entity))
    },
    async signIn({ email, password }) {
      const res = await api.post('/auth/sign-in', { email, password })
      this._persist(res.data)
      return res.data
    },
    async signUp(payload) {
      const res = await api.post('/auth/sign-up', payload)
      this._persist(res.data)
      return res.data
    },
    // Resetting a password also signs you in (see AuthService.resetPassword)
    // - same _persist as sign-in/sign-up.
    async completePasswordReset({ token, password }) {
      const res = await api.post('/auth/reset-password', { token, password })
      this._persist(res.data)
      return res.data
    },
    signOut() {
      this.token = null
      this.entity = null
      this.myBusinesses = []
      this.activeWorkspaceId = null
      localStorage.removeItem('invoecr_token')
      localStorage.removeItem('invoecr_entity')
      localStorage.removeItem('invoecr_workspace_id')
    },
    // The cached `entity` is a snapshot from sign-in/sign-up - it goes stale
    // the moment the server changes something about it on its own (a
    // template selection via PATCH /entity, or a plan upgrade landing via
    // the subscription webhook after a Paystack redirect). Call this after
    // any such mutation, or when a page needs fresh plan/usage numbers.
    //
    // api.js attaches the `x-business-id` header automatically from
    // localStorage whenever a workspace is active, so this correctly
    // reflects whichever business is currently being acted-as, not
    // necessarily the caller's own account.
    async refreshEntity() {
      if (!this.token) return null
      const res = await api.get('/entity/me')
      this.entity = res.data
      localStorage.setItem('invoecr_entity', JSON.stringify(res.data))
      return res.data
    },
    // Businesses this account can act as via an accepted accountant invite.
    // Best-effort/non-fatal - most accounts have none, and a failure here
    // shouldn't break the rest of the app loading.
    async loadMyBusinesses() {
      if (!this.token) return []
      try {
        const res = await api.get('/entity/accountants/my-businesses')
        this.myBusinesses = res.data || []
      } catch {
        this.myBusinesses = []
      }
      return this.myBusinesses
    },
    // Switches the acting workspace. `businessId` is null to switch back to
    // your own account. Refreshes the cached entity afterwards so the UI
    // (business name, plan, logo, etc) immediately reflects whichever
    // business is now active.
    async switchWorkspace(businessId) {
      this.activeWorkspaceId = businessId || null
      if (businessId) localStorage.setItem('invoecr_workspace_id', businessId)
      else localStorage.removeItem('invoecr_workspace_id')
      await this.refreshEntity().catch(() => null)
    },
  },
})

import { defineStore } from 'pinia'
import adminApi from '../lib/adminApi'

// The root panel's session store - deliberately minimal and separate from
// stores/auth.js (the business session). It only ever holds the root
// token/email, never a merchant's data - each view (MerchantList/Detail)
// fetches what it needs directly via adminApi.
export const useAdminStore = defineStore('admin', {
  state: () => ({
    token: localStorage.getItem('invoecr_admin_token') || null,
    email: localStorage.getItem('invoecr_admin_email') || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    async signIn({ email, password }) {
      const res = await adminApi.post('/admin/login', { email, password })
      this.token = res.data.token
      this.email = res.data.email
      localStorage.setItem('invoecr_admin_token', res.data.token)
      localStorage.setItem('invoecr_admin_email', res.data.email)
      return res.data
    },
    signOut() {
      this.token = null
      this.email = null
      localStorage.removeItem('invoecr_admin_token')
      localStorage.removeItem('invoecr_admin_email')
    },
  },
})

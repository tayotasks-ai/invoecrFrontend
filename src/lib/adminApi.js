import axios from 'axios'

// Separate axios instance for the root panel (/root/*) - deliberately not
// the same `api` instance the business app uses (see lib/api.js). Root
// sessions use their own token (invoecr_admin_token, never
// invoecr_token) and never send the accountant workspace-switch header,
// so mixing the two instances would risk a root session accidentally
// reading/writing business-app localStorage keys, or vice versa.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5110/api/v1'

export const adminApi = axios.create({ baseURL })

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('invoecr_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Same response-unwrap/error-normalize shape as lib/api.js, but a 401 here
// sends you back to /root/login, never /sign-in - the two auth domains
// don't overlap.
adminApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const body = error.response?.data
    let message = 'Something went wrong. Please try again.'
    if (body?.message) {
      message =
        typeof body.message === 'string'
          ? body.message
          : Object.values(body.message).flat().join(', ')
    } else if (error.message) {
      message = error.message
    }

    if (error.response?.status === 401 && !error.config?.url?.includes('/admin/login')) {
      localStorage.removeItem('invoecr_admin_token')
      if (!window.location.pathname.startsWith('/root/login')) {
        window.location.href = '/root/login'
      }
    }

    return Promise.reject(new Error(message))
  }
)

export default adminApi

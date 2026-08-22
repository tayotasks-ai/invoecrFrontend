import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5110/api/v1'

export const api = axios.create({ baseURL })

// Attach the JWT (if we have one), and the acting-workspace header if an
// accountant/bookkeeper has switched into a client business (see
// stores/auth.js's switchWorkspace/activeWorkspaceId and
// authorization.service.js's authenticateToken, which is what actually
// enforces this server-side). Reading straight from localStorage here -
// rather than importing the Pinia store - avoids a circular import between
// the store and this module.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('invoecr_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const workspaceId = localStorage.getItem('invoecr_workspace_id')
  if (workspaceId) {
    config.headers['x-business-id'] = workspaceId
  }
  return config
})

// The backend wraps every response as { status, success, message, data }.
// Unwrap that here so call sites just deal in plain data, and normalize
// errors to a single readable message (validation errors come back as an
// object keyed by field - see the backend's Readme.md - so flatten those too).
api.interceptors.response.use(
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

    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('invoecr_token')
      localStorage.removeItem('invoecr_entity')
      if (!window.location.pathname.startsWith('/sign-in')) {
        window.location.href = '/sign-in'
      }
    }

    return Promise.reject(new Error(message))
  }
)

export default api

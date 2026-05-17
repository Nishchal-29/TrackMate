import axios from 'axios'
import { msalInstance, loginRequest } from './msalConfig'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request interceptor: inject auth token (local JWT or Azure AD)
api.interceptors.request.use(async (config) => {
  // Priority 1: Local JWT token
  const localToken = localStorage.getItem('local_token');
  if (localToken) {
    config.headers.Authorization = `Bearer ${localToken}`;
    return config;
  }

  // Priority 2: MSAL (Azure AD) token
  const activeAccount = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (activeAccount) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: activeAccount
      });
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    } catch (error) {
      console.error("Token acquisition failed", error);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor: handle errors (e.g., token expiration)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      console.warn("Session expired or unauthorized. Redirecting to Azure AD login...");
      // Redirect to Microsoft login if the backend rejects our token
      msalInstance.loginRedirect(loginRequest);
    }
    return Promise.reject(error)
  }
)

// ── Goal Sheets ──────────────────────────────────────────────
export const goalSheetApi = {
  getMySheets: (fy) =>
    api.get('/goal-sheets/me', { params: fy ? { financial_year: fy } : {} }),
  getSheet: (id) => api.get(`/goal-sheets/${id}`),
  createSheet: (data) => api.post('/goal-sheets/', data),
  submitSheet: (id) => api.post(`/goal-sheets/${id}/submit`),
  approveSheet: (id) => api.post(`/goal-sheets/${id}/approve`),
  rejectSheet: (id, reason) =>
    api.post(`/goal-sheets/${id}/reject`, { reason }),
  unlockSheet: (id, reason) =>
    api.post(`/goal-sheets/${id}/unlock`, { reason }),
}

// ── Goals ────────────────────────────────────────────────────
export const goalApi = {
  addGoal: (sheetId, data) =>
    api.post(`/goal-sheets/${sheetId}/goals`, data),
  updateGoal: (sheetId, goalId, data) =>
    api.patch(`/goal-sheets/${sheetId}/goals/${goalId}`, data),
  deleteGoal: (sheetId, goalId) =>
    api.delete(`/goal-sheets/${sheetId}/goals/${goalId}`),
}

// ── Achievements ─────────────────────────────────────────────
export const achievementApi = {
  getAchievements: (goalId) => api.get(`/goals/${goalId}/achievements`),
  submitAchievement: (goalId, data) =>
    api.post(`/goals/${goalId}/achievements`, data),
}

// ── Manager ──────────────────────────────────────────────────
export const managerApi = {
  getTeam: () => api.get('/manager/team'),
  getEmployeeSheet: (empId, fy) =>
    api.get(`/manager/team/${empId}/sheet`, {
      params: fy ? { financial_year: fy } : {},
    }),
  addCheckin: (empId, goalId, data) =>
    api.post(`/manager/team/${empId}/goals/${goalId}/checkin`, data),
}

// ── Admin ────────────────────────────────────────────────────
export const adminApi = {
  getDashboard: (fy) =>
    api.get('/admin/dashboard', { params: fy ? { financial_year: fy } : {} }),
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getCycles: () => api.get('/admin/quarterly-cycles'),
  createCycle: (data) => api.post('/admin/quarterly-cycles', data),
  updateCycle: (id, data) =>
    api.patch(`/admin/quarterly-cycles/${id}`, data),
  pushGoal: (data) => api.post('/admin/push-goal', data),
}

export default api
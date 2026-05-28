import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalSheetApi, goalApi, achievementApi, managerApi, adminApi } from './api'

// ── Goal Sheets ──────────────────────────────────────────────
export function useMySheets(fy) {
  return useQuery({
    queryKey: ['my-sheets', fy],
    queryFn: () => goalSheetApi.getMySheets(fy).then(r => r.data),
  })
}

export function useSheet(id) {
  return useQuery({
    queryKey: ['sheet', id],
    queryFn: () => goalSheetApi.getSheet(id).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => goalSheetApi.createSheet(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-sheets'] }),
  })
}

export function useSubmitSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => goalSheetApi.submitSheet(id).then(r => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['sheet', id] })
      qc.invalidateQueries({ queryKey: ['my-sheets'] })
    },
  })
}

export function useApproveSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => goalSheetApi.approveSheet(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}

export function useRejectSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => goalSheetApi.rejectSheet(id, reason).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}

export function useUnlockSheet() {
  const queryClient = useQueryClient()
  
  return useMutation({
    // Make sure we are passing the ID and reason correctly to the API
    mutationFn: ({ id, reason }) => goalSheetApi.unlockSheet(id, reason),
    onSuccess: () => {
      // This forces the dashboard to immediately refresh the table data!
      queryClient.invalidateQueries({ queryKey: ['team'] })
      queryClient.invalidateQueries({ queryKey: ['sheets'] })
    }
  })
}

// ── Goals ────────────────────────────────────────────────────
export function useAddGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sheetId, data }) => goalApi.addGoal(sheetId, data).then(r => r.data),
    onSuccess: (_, { sheetId }) => {
      qc.invalidateQueries({ queryKey: ['sheet', sheetId] })
      qc.invalidateQueries({ queryKey: ['my-sheets'] })
    },
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sheetId, goalId, data }) =>
      goalApi.updateGoal(sheetId, goalId, data).then(r => r.data),
    onSuccess: (_, { sheetId }) =>
      qc.invalidateQueries({ queryKey: ['sheet', sheetId] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sheetId, goalId }) => goalApi.deleteGoal(sheetId, goalId),
    onSuccess: (_, { sheetId }) => {
      qc.invalidateQueries({ queryKey: ['sheet', sheetId] })
      qc.invalidateQueries({ queryKey: ['my-sheets'] })
    },
  })
}

export function useGoalLineage(sheetId, goalId) {
  return useQuery({
    queryKey: ['goal-lineage', sheetId, goalId],
    queryFn: () => goalApi.getGoalLineage(sheetId, goalId).then(r => r.data),
    enabled: !!sheetId && !!goalId,
  })
}

// ── Achievements ─────────────────────────────────────────────
export function useAchievements(goalId) {
  return useQuery({
    queryKey: ['achievements', goalId],
    queryFn: () => achievementApi.getAchievements(goalId).then(r => r.data),
    enabled: !!goalId,
  })
}

export function useSubmitAchievement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, data }) =>
      achievementApi.submitAchievement(goalId, data).then(r => r.data),
    onSuccess: (_, { goalId }) =>
      qc.invalidateQueries({ queryKey: ['achievements', goalId] }),
  })
}

// ── Manager ──────────────────────────────────────────────────
export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: () => managerApi.getTeam().then(r => r.data),
  })
}

export function useEmployeeSheet(empId, fy) {
  return useQuery({
    queryKey: ['employee-sheet', empId, fy],
    queryFn: () => managerApi.getEmployeeSheet(empId, fy).then(r => r.data),
    enabled: !!empId,
  })
}

export function useAddCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ empId, goalId, data }) =>
      managerApi.addCheckin(empId, goalId, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-sheet'] }),
  })
}

export const useCascadeGoal = () => {
  return useMutation({
    mutationFn: async ({ goalId, data }) => {
      const res = await managerApi.cascadeGoal(goalId, data)
      return res.data
    }
  })
}

// ── Admin ────────────────────────────────────────────────────
export function useDashboard(fy) {
  return useQuery({
    queryKey: ['dashboard', fy],
    queryFn: () => adminApi.getDashboard(fy).then(r => r.data),
  })
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await adminApi.getUsers()
      return res.data
    }
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useAuditLogs(params) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => adminApi.getAuditLogs(params).then(r => r.data),
  })
}

export function useCycles() {
  return useQuery({
    queryKey: ['cycles'],
    queryFn: () => adminApi.getCycles().then(r => r.data),
  })
}

export function useCreateCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => adminApi.createCycle(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycles'] }),
  })
}

export const useUpdateCycle = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => adminApi.updateCycle(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cycles'] }),
  })
}

export const useDeleteCycle = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => adminApi.deleteCycle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cycles'] }),
  })
}

export const usePushGoal = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const res = await adminApi.pushGoal(data)
      return res.data
    },
    onSuccess: () => {
      // Refresh admin stats if needed
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
    }
  })
}
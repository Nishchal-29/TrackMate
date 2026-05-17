import { useState } from 'react'
import { useUsers, useUpdateUser } from '@/lib/queries'
import { Card, Button, Input, Select, EmptyState, Skeleton, Modal } from '@/components/ui'
import { Shield, Search, Edit3, Users } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
]

export default function UserManagement() {
  const { data: users, isLoading } = useUsers()
  const updateUser = useUpdateUser()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})

  const filtered = users?.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  }) || []

  const handleEdit = (user) => {
    setEditUser(user)
    setEditForm({ role: user.role, department: user.department || '', is_active: user.is_active })
  }

  const handleSave = async () => {
    try {
      await updateUser.mutateAsync({ id: editUser.id, data: editForm })
      setEditUser(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user')
    }
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{users?.length || 0} registered users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          options={[{ value: '', label: 'All Roles' }, ...ROLE_OPTIONS]}
          className="w-40"
        />
      </div>

      {/* Users table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try adjusting your search filters." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">User</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Department</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-primary)] transition-colors animate-slide-up" style={{ animationDelay: `${i * 20}ms` }}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
                          {u.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{u.full_name}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === 'admin' ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]' :
                        u.role === 'manager' ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]' :
                        'bg-[var(--color-info-soft)] text-[var(--color-info)]'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">{u.department || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`w-2 h-2 inline-block rounded-full ${u.is_active ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-muted)]'}`} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit — ${editUser?.full_name}`}>
        <div className="space-y-4">
          <Select label="Role" value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} options={ROLE_OPTIONS} />
          <Input label="Department" value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Engineering" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={editForm.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
            <label htmlFor="active" className="text-sm">Active</label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={updateUser.isPending}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

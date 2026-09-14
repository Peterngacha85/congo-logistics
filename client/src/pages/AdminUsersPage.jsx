import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userService } from '../services/userService'
import { branchService } from '../services/branchService'
import { authService } from '../services/authService'
import { useNotification } from '../hooks/useNotification'
import { useSocketEvent } from '../hooks/useSocket'
import { managerSchema } from '../utils/validators'
import { SOCKET_EVENTS } from '../utils/constants'
import Button from '../components/Common/Button'
import Modal from '../components/Common/Modal'
import Badge from '../components/Common/Badge'
import LoadingSpinner from '../components/Common/LoadingSpinner'

function PendingApprovalRow({ user, branches, onApprove, onReject }) {
  const [branchId, setBranchId] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const approve = async () => {
    if (!branchId) return
    setIsBusy(true)
    try {
      await onApprove(user._id, branchId)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="font-medium text-slate-900">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-sm text-slate-500">{user.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Assign branch...</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.branchName}
            </option>
          ))}
        </select>
        <Button onClick={approve} disabled={!branchId} isLoading={isBusy}>
          Approve
        </Button>
        <Button variant="danger" onClick={() => onReject(user._id)}>
          Reject
        </Button>
      </div>
    </li>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdmins, setShowAdmins] = useState(false)
  const { showNotification } = useNotification()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ resolver: zodResolver(managerSchema) })

  const fetchData = (showSpinner = true) => {
    if (showSpinner) setIsLoading(true)
    Promise.all([userService.getUsers(), branchService.getBranches()])
      .then(([usersRes, branchesRes]) => {
        setUsers(usersRes.data.data)
        setBranches(branchesRes.data.data)
      })
      .catch(() => showNotification('Failed to load users', 'error'))
      .finally(() => setIsLoading(false))
  }

  useSocketEvent(SOCKET_EVENTS.MANAGER_REGISTERED, (payload) => {
    showNotification(`${payload.name} just registered and is awaiting approval`, 'info')
    fetchData(false)
  })
  useSocketEvent(SOCKET_EVENTS.MANAGER_APPROVED, () => fetchData(false))
  useSocketEvent(SOCKET_EVENTS.MANAGER_REJECTED, () => fetchData(false))

  useEffect(fetchData, [])

  const onSubmit = async (values) => {
    setIsSubmitting(true)
    try {
      await authService.registerManager(values)
      showNotification('Branch manager created successfully', 'success')
      setIsCreateOpen(false)
      reset()
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to create user', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Deactivate this user?')) return
    try {
      await userService.deleteUser(userId)
      showNotification('User deactivated', 'success')
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to deactivate user', 'error')
    }
  }

  const handleApprove = async (userId, branchId) => {
    try {
      await userService.approveUser(userId, branchId)
      showNotification('User approved and assigned to branch', 'success')
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to approve user', 'error')
    }
  }

  const handleReject = async (userId) => {
    if (!window.confirm('Reject this registration? The account will be deactivated.')) return
    try {
      await userService.deleteUser(userId)
      showNotification('Registration rejected', 'success')
      fetchData()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to reject user', 'error')
    }
  }

  const pendingUsers = users.filter((u) => u.status === 'PENDING_APPROVAL')
  const otherUsers = users.filter(
    (u) => u.status !== 'PENDING_APPROVAL' && (showAdmins || u.role !== 'SUPER_ADMIN')
  )
  const adminCount = users.filter((u) => u.role === 'SUPER_ADMIN').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
        <div className="flex items-center gap-3">
          {adminCount > 0 && (
            <Button variant="secondary" onClick={() => setShowAdmins((v) => !v)}>
              {showAdmins ? 'Hide Super Admins' : `Show Super Admins (${adminCount})`}
            </Button>
          )}
          <Button onClick={() => setIsCreateOpen(true)}>New Branch Manager</Button>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-2 font-semibold text-amber-900">Pending Approvals ({pendingUsers.length})</h2>
          <ul className="divide-y divide-amber-200">
            {pendingUsers.map((u) => (
              <PendingApprovalRow
                key={u._id}
                user={u}
                branches={branches}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {otherUsers.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-slate-100 text-slate-700">{u.role.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3">{u.status}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role === 'BRANCH_MANAGER' && u.status !== 'INACTIVE' && (
                      <Button size="sm" variant="danger-outline" onClick={() => handleDeactivate(u._id)}>
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Branch Manager">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">First Name</label>
              <input {...register('firstName')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Last Name</label>
              <input {...register('lastName')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" {...register('email')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone (optional)</label>
            <input {...register('phone')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Temporary Password</label>
            <input type="text" {...register('password')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Branch</label>
            <select {...register('branchId')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select a branch</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.branchName}
                </option>
              ))}
            </select>
            {errors.branchId && <p className="mt-1 text-xs text-red-600">{errors.branchId.message}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Manager
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

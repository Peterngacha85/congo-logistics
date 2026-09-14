import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { branchService } from '../services/branchService'
import { useNotification } from '../hooks/useNotification'
import Button from '../components/Common/Button'
import Modal from '../components/Common/Modal'
import Badge from '../components/Common/Badge'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const emptyValues = { branchName: '', branchCode: '', location: '', address: '', phone: '', email: '' }

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalMode, setModalMode] = useState(null) // 'create' | 'edit' | null
  const [editingBranch, setEditingBranch] = useState(null)
  const { showNotification } = useNotification()
  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyValues })

  const fetchBranches = () => {
    setIsLoading(true)
    branchService
      .getBranches()
      .then(({ data }) => setBranches(data.data))
      .catch(() => showNotification('Failed to load branches', 'error'))
      .finally(() => setIsLoading(false))
  }

  useEffect(fetchBranches, [])

  const openCreate = () => {
    reset(emptyValues)
    setEditingBranch(null)
    setModalMode('create')
  }

  const openEdit = (branch) => {
    reset({
      branchName: branch.branchName || '',
      branchCode: branch.branchCode || '',
      location: branch.location || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || ''
    })
    setEditingBranch(branch)
    setModalMode('edit')
  }

  const closeModal = () => setModalMode(null)

  const onSubmit = async (values) => {
    setIsSubmitting(true)
    try {
      if (modalMode === 'edit') {
        await branchService.updateBranch(editingBranch._id, values)
        showNotification('Branch updated successfully', 'success')
      } else {
        await branchService.createBranch(values)
        showNotification('Branch created successfully', 'success')
      }
      closeModal()
      fetchBranches()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to save branch', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleActive = async (branch) => {
    try {
      await branchService.updateBranch(branch._id, { isActive: !branch.isActive })
      showNotification(`Branch ${branch.isActive ? 'deactivated' : 'activated'}`, 'success')
      fetchBranches()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to update branch', 'error')
    }
  }

  const handleDelete = async (branch) => {
    if (!window.confirm(`Delete branch "${branch.branchName}"? This cannot be undone.`)) return
    try {
      await branchService.deleteBranch(branch._id)
      showNotification('Branch deleted', 'success')
      fetchBranches()
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to delete branch', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Branches</h1>
        <Button onClick={openCreate}>New Branch</Button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Manager</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => (
                <tr key={b._id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{b.branchCode}</td>
                  <td className="px-4 py-3">{b.branchName}</td>
                  <td className="px-4 py-3">{b.location}</td>
                  <td className="px-4 py-3">
                    {b.managerId ? `${b.managerId.firstName} ${b.managerId.lastName}` : 'Unassigned'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleActive(b)}>
                        {b.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="danger-outline" onClick={() => handleDelete(b)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={!!modalMode} onClose={closeModal} title={modalMode === 'edit' ? 'Edit Branch' : 'New Branch'}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Branch Name</label>
            <input {...register('branchName', { required: true })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Branch Code</label>
            <input
              {...register('branchCode', { required: true })}
              disabled={modalMode === 'edit'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
              placeholder="e.g. KIN-001"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <input {...register('location')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
            <input {...register('address')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
              <input {...register('phone')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input {...register('email')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {modalMode === 'edit' ? 'Save Changes' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

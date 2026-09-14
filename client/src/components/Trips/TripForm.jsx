import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tripSchema } from '../../utils/validators'
import { formatCurrency, toDateInputValue } from '../../utils/formatters'
import { truckService } from '../../services/truckService'
import { transporterService } from '../../services/transporterService'
import { useNotification } from '../../hooks/useNotification'
import Button from '../Common/Button'
import QuickAddTruckModal from './QuickAddTruckModal'
import QuickAddDriverModal from './QuickAddDriverModal'

const NEW_TRUCK_VALUE = '__new_truck__'
const NEW_DRIVER_VALUE = '__new_driver__'

const defaultValues = {
  truckId: '',
  transporterId: '',
  trailerNumber: '',
  loadingPoint: '',
  offloadingPoint: '',
  dateLoaded: '',
  dateOffloaded: '',
  transportationRate: '',
  dieselPerTrip: '',
  mileageCash: '',
  notes: ''
}

export default function TripForm({ trip = null, onSubmit, isSubmitting = false, onCancel }) {
  const { showNotification } = useNotification()
  const [trucks, setTrucks] = useState([])
  const [drivers, setDrivers] = useState([])
  const [quickAddOpen, setQuickAddOpen] = useState(null) // 'truck' | 'driver' | null

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(tripSchema),
    defaultValues: trip
      ? {
          ...defaultValues,
          ...trip,
          truckId: trip.truckId || '',
          transporterId: trip.transporterId || '',
          dateLoaded: toDateInputValue(trip.dateLoaded),
          dateOffloaded: toDateInputValue(trip.dateOffloaded)
        }
      : defaultValues
  })

  const loadOptions = () => {
    truckService
      .getTrucks()
      .then(({ data }) => {
        let list = data.data.filter((t) => t.approvalStatus === 'APPROVED')
        if (trip?.truckId && !list.some((t) => t._id === trip.truckId)) {
          list = [{ _id: trip.truckId, truckNumber: trip.truckNumber, approvalStatus: 'APPROVED' }, ...list]
        }
        setTrucks(list)
      })
      .catch(() => showNotification('Failed to load trucks', 'error'))

    transporterService
      .getTransporters()
      .then(({ data }) => {
        let list = data.data.filter((t) => t.approvalStatus === 'APPROVED')
        if (trip?.transporterId && !list.some((t) => t._id === trip.transporterId)) {
          list = [{ _id: trip.transporterId, name: trip.transporterName, approvalStatus: 'APPROVED' }, ...list]
        }
        setDrivers(list)
      })
      .catch(() => showNotification('Failed to load drivers', 'error'))
  }

  useEffect(loadOptions, [])

  const [rate, diesel, mileage] = watch(['transportationRate', 'dieselPerTrip', 'mileageCash'])
  const subtotal = (Number(rate) || 0) + (Number(diesel) || 0) + (Number(mileage) || 0)
  const serviceFee = Math.round(subtotal * 0.05)
  const total = subtotal + serviceFee

  const truckRegistration = register('truckId')
  const driverRegistration = register('transporterId')

  const handleTruckChange = (e) => {
    if (e.target.value === NEW_TRUCK_VALUE) {
      setQuickAddOpen('truck')
      e.target.value = ''
      return
    }
    truckRegistration.onChange(e)
  }

  const handleDriverChange = (e) => {
    if (e.target.value === NEW_DRIVER_VALUE) {
      setQuickAddOpen('driver')
      e.target.value = ''
      return
    }
    driverRegistration.onChange(e)
  }

  const handleTruckCreated = async (values) => {
    try {
      await truckService.createTruck(values)
      showNotification('Truck submitted - it will appear here once an admin approves it', 'success')
      setQuickAddOpen(null)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to add truck', 'error')
    }
  }

  const handleDriverCreated = async (values) => {
    try {
      await transporterService.createTransporter(values)
      showNotification('Driver submitted - they will appear here once an admin approves them', 'success')
      setQuickAddOpen(null)
    } catch (err) {
      showNotification(err.response?.data?.error?.message || 'Failed to add driver', 'error')
    }
  }

  const field = (name, label, type = 'text', extra = {}) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        step={type === 'number' ? 'any' : undefined}
        {...register(name)}
        {...extra}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name].message}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Truck</label>
          <select
            name={truckRegistration.name}
            ref={truckRegistration.ref}
            onBlur={truckRegistration.onBlur}
            defaultValue={trip?.truckId || ''}
            onChange={handleTruckChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select a truck...</option>
            {trucks.map((t) => (
              <option key={t._id} value={t._id}>
                {t.truckNumber}
              </option>
            ))}
            <option value={NEW_TRUCK_VALUE}>+ Add new truck...</option>
          </select>
          {errors.truckId && <p className="mt-1 text-xs text-red-600">{errors.truckId.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Driver</label>
          <select
            name={driverRegistration.name}
            ref={driverRegistration.ref}
            onBlur={driverRegistration.onBlur}
            defaultValue={trip?.transporterId || ''}
            onChange={handleDriverChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select a driver...</option>
            {drivers.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
            <option value={NEW_DRIVER_VALUE}>+ Add new driver...</option>
          </select>
          {errors.transporterId && <p className="mt-1 text-xs text-red-600">{errors.transporterId.message}</p>}
        </div>

        {field('trailerNumber', 'Trailer Number (optional)')}
        {field('loadingPoint', 'Loading Point')}
        {field('offloadingPoint', 'Offloading Point')}
        {field('dateLoaded', 'Date Loaded', 'date')}
        {field('dateOffloaded', 'Date Offloaded', 'date')}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {field('transportationRate', 'Transportation Rate (CDF)', 'number')}
        {field('dieselPerTrip', 'Diesel Per Trip (CDF)', 'number')}
        {field('mileageCash', 'Mileage Cash (CDF)', 'number')}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div className="rounded-lg bg-accent-100 p-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Service Fee (5%)</span>
          <span>{formatCurrency(serviceFee)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-accent-200 pt-1 font-semibold text-primary-800">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting}>
          {trip ? 'Save Changes' : 'Create Trip'}
        </Button>
      </div>

      <QuickAddTruckModal
        isOpen={quickAddOpen === 'truck'}
        onClose={() => setQuickAddOpen(null)}
        onCreated={handleTruckCreated}
      />
      <QuickAddDriverModal
        isOpen={quickAddOpen === 'driver'}
        onClose={() => setQuickAddOpen(null)}
        onCreated={handleDriverCreated}
      />
    </form>
  )
}

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  BRANCH_MANAGER: 'BRANCH_MANAGER'
}

export const TRIP_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  INVOICED: 'INVOICED',
  PAID: 'PAID'
}

export const TRIP_STATUS_LIST = Object.values(TRIP_STATUS)

export const NEXT_STATUS = {
  PENDING: 'ASSIGNED',
  ASSIGNED: 'IN_TRANSIT',
  IN_TRANSIT: 'COMPLETED'
}

export const NEXT_STATUS_LABEL = {
  PENDING: 'Assign Truck',
  ASSIGNED: 'Mark In Transit',
  IN_TRANSIT: 'Mark Completed'
}

export const PAYMENT_METHODS = [
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' }
]

export const SOCKET_EVENTS = {
  MANAGER_REGISTERED: 'manager:registered',
  MANAGER_APPROVED: 'manager:approved',
  MANAGER_REJECTED: 'manager:rejected',
  TRIP_CREATED: 'trip:created',
  TRIP_UPDATED: 'trip:updated',
  TRIP_STATUS_CHANGED: 'trip:statusChanged',
  TRIP_INVOICED: 'trip:invoiced',
  TRIP_PAID: 'trip:paid',
  TRIP_DELETED: 'trip:deleted',
  TRUCK_REGISTERED: 'truck:registered',
  TRUCK_APPROVED: 'truck:approved',
  TRUCK_REJECTED: 'truck:rejected',
  TRANSPORTER_REGISTERED: 'transporter:registered',
  TRANSPORTER_APPROVED: 'transporter:approved',
  TRANSPORTER_REJECTED: 'transporter:rejected'
}

export const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-blue-200 text-blue-900',
  COMPLETED: 'bg-green-100 text-green-800',
  INVOICED: 'bg-purple-100 text-purple-800',
  PAID: 'bg-emerald-200 text-emerald-900'
}

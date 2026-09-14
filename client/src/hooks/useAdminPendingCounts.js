import { useCallback, useEffect, useState } from 'react'
import { userService } from '../services/userService'
import { truckService } from '../services/truckService'
import { transporterService } from '../services/transporterService'
import { useAuth } from './useAuth'
import { useSocketEvent } from './useSocket'
import { ROLES, SOCKET_EVENTS } from '../utils/constants'

// Live counts of everything awaiting Super Admin approval - manager
// signups, manager-submitted trucks, and manager-submitted drivers - kept in
// sync via socket events so Sidebar badges update without a page refresh.
export function useAdminPendingCounts() {
  const { user } = useAuth()
  const isAdmin = user?.role === ROLES.SUPER_ADMIN
  const [counts, setCounts] = useState({ managers: 0, trucks: 0, transporters: 0 })

  const refetch = useCallback(() => {
    if (!isAdmin) return
    Promise.all([
      userService.getUsers({ status: 'PENDING_APPROVAL' }),
      truckService.getTrucks({ approvalStatus: 'PENDING_APPROVAL' }),
      transporterService.getTransporters({ approvalStatus: 'PENDING_APPROVAL' })
    ])
      .then(([usersRes, trucksRes, transportersRes]) => {
        setCounts({
          managers: usersRes.data.data.length,
          trucks: trucksRes.data.data.length,
          transporters: transportersRes.data.data.length
        })
      })
      .catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    refetch()
  }, [refetch])

  useSocketEvent(SOCKET_EVENTS.MANAGER_REGISTERED, refetch)
  useSocketEvent(SOCKET_EVENTS.MANAGER_APPROVED, refetch)
  useSocketEvent(SOCKET_EVENTS.MANAGER_REJECTED, refetch)
  useSocketEvent(SOCKET_EVENTS.TRUCK_REGISTERED, refetch)
  useSocketEvent(SOCKET_EVENTS.TRUCK_APPROVED, refetch)
  useSocketEvent(SOCKET_EVENTS.TRUCK_REJECTED, refetch)
  useSocketEvent(SOCKET_EVENTS.TRANSPORTER_REGISTERED, refetch)
  useSocketEvent(SOCKET_EVENTS.TRANSPORTER_APPROVED, refetch)
  useSocketEvent(SOCKET_EVENTS.TRANSPORTER_REJECTED, refetch)

  return isAdmin ? counts : { managers: 0, trucks: 0, transporters: 0 }
}

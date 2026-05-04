import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole) {
    const roleHierarchy = { viewer: 0, editor: 1, admin: 2 }
    const userLevel    = roleHierarchy[user?.role] ?? 0
    const requiredLevel = roleHierarchy[requiredRole] ?? 0
    if (userLevel < requiredLevel) return <Navigate to="/dashboard" replace />
  }

  return children
}
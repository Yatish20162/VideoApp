import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Library from './pages/Library'
import Player from './pages/Player'
import AdminPanel from './pages/AdminPanel'

function AppLayout({ children }) {
  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: '64px' }}>
        {children}
      </main>
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Routes>
      <Route path="/login"    element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route path="/dashboard" element={
        <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
      } />
      <Route path="/upload" element={
        <ProtectedRoute><AppLayout><Upload /></AppLayout></ProtectedRoute>
      } />
      <Route path="/library" element={
        <ProtectedRoute><AppLayout><Library /></AppLayout></ProtectedRoute>
      } />
      <Route path="/player/:id" element={
        <ProtectedRoute><AppLayout><Player /></AppLayout></ProtectedRoute>
      } />
      <Route
  path="/admin"
  element={
    <ProtectedRoute requiredRole="admin"><AppLayout>
      <AdminPanel />
      </AppLayout>
    </ProtectedRoute>
  }
/>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
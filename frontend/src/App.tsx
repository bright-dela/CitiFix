import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import CitizenDashboard from "./pages/dashboards/CitizenDashboard"
import AuthorityDashboard from "./pages/dashboards/AuthorityDashboard"
import MediaDashboard from "./pages/dashboards/MediaDashboard"
import ProfilePage from "./pages/ProfilePage"
import "./App.css"

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/citizen" element={<CitizenDashboard />} />
            <Route path="/dashboard/authority" element={<AuthorityDashboard />} />
            <Route path="/dashboard/media" element={<MediaDashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

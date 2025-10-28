import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/layout/Navbar';
import NotificationCenter from './components/layout/NotificationCenter';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import RegisterCitizen from './pages/auth/RegisterCitizen';
import RegisterAuthority from './pages/auth/RegisterAuthority';
import RegisterMediaHouse from './pages/auth/RegisterMediaHouse';

// Citizen Pages
import CitizenDashboard from './pages/citizen/Dashboard';
import CreateReport from './pages/citizen/CreateReport';
import MyReports from './pages/citizen/MyReports';

// Authority Pages
import AuthorityDashboard from './pages/authority/Dashboard';
import AssignedReports from './pages/authority/AssignedReports';
import UploadDocuments from './pages/authority/UploadDocuments';

// Media Pages
import MediaDashboard from './pages/media/Dashboard';
import PublicReports from './pages/media/PublicReports';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import PendingVerifications from './pages/admin/PendingVerifications';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <NotificationCenter />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register/citizen" element={<RegisterCitizen />} />
              <Route path="/register/authority" element={<RegisterAuthority />} />
              <Route path="/register/media" element={<RegisterMediaHouse />} />

              {/* Citizen Routes */}
              <Route
                path="/citizen/dashboard"
                element={
                  <ProtectedRoute allowedTypes={['citizen']}>
                    <CitizenDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/create-report"
                element={
                  <ProtectedRoute allowedTypes={['citizen']}>
                    <CreateReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/my-reports"
                element={
                  <ProtectedRoute allowedTypes={['citizen']}>
                    <MyReports />
                  </ProtectedRoute>
                }
              />

              {/* Authority Routes */}
              <Route
                path="/authority/dashboard"
                element={
                  <ProtectedRoute allowedTypes={['authority']} requireActive={false}>
                    <AuthorityDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/assigned-reports"
                element={
                  <ProtectedRoute allowedTypes={['authority']}>
                    <AssignedReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/authority/upload-documents"
                element={
                  <ProtectedRoute allowedTypes={['authority']} requireActive={false}>
                    <UploadDocuments />
                  </ProtectedRoute>
                }
              />

              {/* Media Routes */}
              <Route
                path="/media/dashboard"
                element={
                  <ProtectedRoute allowedTypes={['media_house']}>
                    <MediaDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/media/reports"
                element={
                  <ProtectedRoute allowedTypes={['media_house']}>
                    <PublicReports />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedTypes={['superadmin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pending-verifications"
                element={
                  <ProtectedRoute allowedTypes={['superadmin']}>
                    <PendingVerifications />
                  </ProtectedRoute>
                }
              />

              {/* Status Pages */}
              <Route
                path="/pending-approval"
                element={
                  <div className="container mx-auto px-4 py-16 text-center">
                    <h1 className="text-3xl font-bold text-yellow-600 mb-4">
                      Account Pending Approval
                    </h1>
                    <p className="text-gray-600 mb-4">
                      Your account is awaiting admin verification. You will be notified once approved.
                    </p>
                  </div>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
import React, { useState, useEffect, createContext, useContext } from 'react';
import { AlertCircle, Bell, CheckCircle, Clock, FileText, Home, LogOut, Map, Shield, User, Menu, X, Plus, Eye, Download, Send } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// API Service
const api = {
  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', token);
    }
  },

  getToken: () => localStorage.getItem('access_token'),

  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  request: async (endpoint, options = {}) => {
    const token = api.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        api.clearTokens();
        window.location.href = '/';
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Auth endpoints
  login: (phone_number, password) =>
    api.request('/users/login/', {
      method: 'POST',
      body: JSON.stringify({ phone_number, password }),
    }),

  registerCitizen: (data) =>
    api.request('/users/register/citizen/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  registerAuthority: (data) =>
    api.request('/users/register/authority/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  registerMedia: (data) =>
    api.request('/users/register/media/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Incidents
  createIncident: (data) =>
    api.request('/incidents/create/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listIncidents: () => api.request('/incidents/list/'),

  getIncident: (id) => api.request(`/incidents/${id}/`),

  verifyIncident: (id, autoAssign = true) =>
    api.request(`/incidents/${id}/verify/`, {
      method: 'POST',
      body: JSON.stringify({ auto_assign: autoAssign }),
    }),

  autoAssignIncident: (id) =>
    api.request(`/incidents/${id}/auto-assign/`, {
      method: 'POST',
    }),

  // Assignments
  listAssignments: () => api.request('/incidents/assignments/'),

  updateAssignmentStatus: (id, status, notes = '') =>
    api.request(`/incidents/assignments/${id}/status/`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }),

  // Notifications
  listNotifications: (unreadOnly = false) =>
    api.request(`/notifications/?unread_only=${unreadOnly}`),

  markNotificationRead: (id) =>
    api.request(`/notifications/${id}/read/`, {
      method: 'POST',
    }),

  markAllNotificationsRead: () =>
    api.request('/notifications/mark-all-read/', {
      method: 'POST',
    }),

  // Media House endpoints
  listMediaIncidents: () => api.request('/incidents/media/list/'),

  downloadMedia: (mediaId) => {
    const token = api.getToken();
    return fetch(`${API_BASE_URL}/incidents/media/${mediaId}/download/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Admin endpoints
  getPendingApprovals: () => api.request('/users/admin/approvals/'),

  approveAuthority: (id) =>
    api.request(`/users/admin/approve/authority/${id}/`, {
      method: 'POST',
    }),

  approveMedia: (id) =>
    api.request(`/users/admin/approve/media/${id}/`, {
      method: 'POST',
    }),
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (phone_number, password) => {
    const data = await api.login(phone_number, password);
    api.setToken(data.access);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
  };

  const register = async (userData, userType) => {
    if (userType === 'citizen') {
      await api.registerCitizen(userData);
    } else if (userType === 'authority') {
      await api.registerAuthority(userData);
    } else if (userType === 'media') {
      await api.registerMedia(userData);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const LoginPage = ({ onRegisterClick }) => {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(phone, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">CitiFix</h1>
          <p className="text-gray-600 mt-2">Emergency Response Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+233 XX XXX XXXX"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onRegisterClick}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Don't have an account? Register
          </button>
        </div>
      </div>
    </div>
  );
};

// Registration Component
const RegisterPage = ({ onBackClick }) => {
  const { register } = useAuth();
  const [userType, setUserType] = useState('citizen');
  const [formData, setFormData] = useState({
    phone_number: '',
    password: '',
    full_name: '',
    email: '',
  });
  const [authorityData, setAuthorityData] = useState({
    organization_name: '',
    authority_type: 'police',
    license_number: '',
    station_address: '',
    region: '',
    district: '',
    official_email: '',
    contact_phone: '',
  });
  const [mediaData, setMediaData] = useState({
    organization_name: '',
    media_type: 'newspaper',
    license_number: '',
    official_email: '',
    contact_phone: '',
    address: '',
    city: '',
    region: '',
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let submitData = { ...formData };
      
      if (userType === 'authority') {
        submitData = { ...formData, ...authorityData };
      } else if (userType === 'media') {
        submitData = { ...formData, ...mediaData };
      }

      await register(submitData, userType);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-6">
            {userType === 'authority' || userType === 'media'
              ? 'Your account is pending approval. You will be notified once approved.'
              : 'You can now log in with your credentials.'}
          </p>
          <button
            onClick={onBackClick}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Register</h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setUserType('citizen')}
            className={`flex-1 py-2 px-4 rounded-lg transition ${
              userType === 'citizen'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Citizen
          </button>
          <button
            onClick={() => setUserType('authority')}
            className={`flex-1 py-2 px-4 rounded-lg transition ${
              userType === 'authority'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Authority
          </button>
          <button
            onClick={() => setUserType('media')}
            className={`flex-1 py-2 px-4 rounded-lg transition ${
              userType === 'media'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Media House
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {userType === 'authority' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={authorityData.organization_name}
                  onChange={(e) => setAuthorityData({ ...authorityData, organization_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authority Type
                </label>
                <select
                  value={authorityData.authority_type}
                  onChange={(e) => setAuthorityData({ ...authorityData, authority_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="police">Police Service</option>
                  <option value="fire">Fire Service</option>
                  <option value="ambulance">Ambulance Service</option>
                  <option value="hospital">Hospital</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  value={authorityData.license_number}
                  onChange={(e) => setAuthorityData({ ...authorityData, license_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={authorityData.contact_phone}
                  onChange={(e) => setAuthorityData({ ...authorityData, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Station Address
                </label>
                <input
                  type="text"
                  value={authorityData.station_address}
                  onChange={(e) => setAuthorityData({ ...authorityData, station_address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region
                </label>
                <input
                  type="text"
                  value={authorityData.region}
                  onChange={(e) => setAuthorityData({ ...authorityData, region: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District
                </label>
                <input
                  type="text"
                  value={authorityData.district}
                  onChange={(e) => setAuthorityData({ ...authorityData, district: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Official Email
                </label>
                <input
                  type="email"
                  value={authorityData.official_email}
                  onChange={(e) => setAuthorityData({ ...authorityData, official_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          )}

          {userType === 'media' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={mediaData.organization_name}
                  onChange={(e) => setMediaData({ ...mediaData, organization_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media Type
                </label>
                <select
                  value={mediaData.media_type}
                  onChange={(e) => setMediaData({ ...mediaData, media_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="newspaper">Newspaper</option>
                  <option value="tv">Television</option>
                  <option value="radio">Radio</option>
                  <option value="online">Online Media</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  value={mediaData.license_number}
                  onChange={(e) => setMediaData({ ...mediaData, license_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={mediaData.contact_phone}
                  onChange={(e) => setMediaData({ ...mediaData, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Official Email
                </label>
                <input
                  type="email"
                  value={mediaData.official_email}
                  onChange={(e) => setMediaData({ ...mediaData, official_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={mediaData.city}
                  onChange={(e) => setMediaData({ ...mediaData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region
                </label>
                <input
                  type="text"
                  value={mediaData.region}
                  onChange={(e) => setMediaData({ ...mediaData, region: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={mediaData.address}
                  onChange={(e) => setMediaData({ ...mediaData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onBackClick}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
            >
              Back to Login
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// Dashboard Header
const DashboardHeader = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.listNotifications(true);
      setNotifications(data.results || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="lg:hidden">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-800">CitiFix</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <Bell className="w-6 h-6 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleMarkRead(notif.id)}
                      >
                        <p className="font-medium text-gray-800">{notif.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <User className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700">{user?.full_name}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

// Citizen Dashboard
const CitizenDashboard = () => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const data = await api.listIncidents();
      setIncidents(data.results || data || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (incidentData) => {
    try {
      await api.createIncident(incidentData);
      setShowReportForm(false);
      loadIncidents();
    } catch (err) {
      console.error('Failed to create incident:', err);
      throw err;
    }
  };

  if (showReportForm) {
    return <ReportIncidentForm onBack={() => setShowReportForm(false)} onSubmit={handleReportSubmit} />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Incidents</h1>
        <button
          onClick={() => setShowReportForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Report Emergency
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading incidents...</div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No incidents reported yet. Click "Report Emergency" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
};

// Report Incident Form
const ReportIncidentForm = ({ onBack, onSubmit }) => {
  const [formData, setFormData] = useState({
    incident_type: 'medical',
    severity: 'medium',
    description: '',
    latitude: 5.6037,
    longitude: -0.1870,
    address: '',
    is_anonymous: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Report Emergency</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Incident Type
            </label>
            <select
              value={formData.incident_type}
              onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="fire">Fire</option>
              <option value="medical">Medical Emergency</option>
              <option value="crime">Crime</option>
              <option value="accident">Accident</option>
              <option value="disaster">Natural Disaster</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="4"
              maxLength="500"
              placeholder="Describe the emergency..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="0.00000001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="0.00000001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address (Optional)
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter location address"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={formData.is_anonymous}
              onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="anonymous" className="text-sm text-gray-700">
              Report anonymously
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Incident Card Component
const IncidentCard = ({ incident }) => {
  const severityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    verified: 'bg-blue-100 text-blue-800',
    assigned: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    resolved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800 capitalize">
              {incident.incident_type.replace('_', ' ')}
            </h3>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{incident.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${severityColors[incident.severity]}`}>
          {incident.severity}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[incident.status]}`}>
          {incident.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="w-4 h-4" />
        <span>{new Date(incident.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
};

// Authority Dashboard
const AuthorityDashboard = () => {
  const [view, setView] = useState('incidents');
  const [incidents, setIncidents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'incidents') {
        const data = await api.listIncidents();
        setIncidents(data.results || data || []);
      } else {
        const data = await api.listAssignments();
        setAssignments(data.results || data || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (incidentId) => {
    try {
      await api.verifyIncident(incidentId, true);
      loadData();
    } catch (err) {
      console.error('Failed to verify incident:', err);
    }
  };

  const handleAutoAssign = async (incidentId) => {
    try {
      await api.autoAssignIncident(incidentId);
      loadData();
    } catch (err) {
      console.error('Failed to auto-assign:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setView('incidents')}
            className={`px-4 py-2 font-medium transition ${
              view === 'incidents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            All Incidents
          </button>
          <button
            onClick={() => setView('assignments')}
            className={`px-4 py-2 font-medium transition ${
              view === 'assignments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            My Assignments
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : view === 'incidents' ? (
        <div className="space-y-4">
          {incidents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No incidents found</div>
          ) : (
            incidents.map((incident) => (
              <AuthorityIncidentCard
                key={incident.id}
                incident={incident}
                onVerify={handleVerify}
                onAutoAssign={handleAutoAssign}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No assignments yet</div>
          ) : (
            assignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} onUpdate={loadData} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Authority Incident Card
const AuthorityIncidentCard = ({ incident, onVerify, onAutoAssign }) => {
  const severityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800 capitalize">
              {incident.incident_type.replace('_', ' ')}
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${severityColors[incident.severity]}`}>
              {incident.severity}
            </span>
          </div>
          <p className="text-gray-600">{incident.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500">Reporter:</span>
          <span className="ml-2 font-medium">{incident.reporter_name || 'Anonymous'}</span>
        </div>
        <div>
          <span className="text-gray-500">Status:</span>
          <span className="ml-2 font-medium capitalize">{incident.status.replace('_', ' ')}</span>
        </div>
        <div>
          <span className="text-gray-500">Location:</span>
          <span className="ml-2 font-medium">{incident.location_address || `${incident.region}, ${incident.district}`}</span>
        </div>
        <div>
          <span className="text-gray-500">Reported:</span>
          <span className="ml-2 font-medium">{new Date(incident.created_at).toLocaleString()}</span>
        </div>
      </div>

      {incident.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onVerify(incident.id)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <CheckCircle className="w-4 h-4" />
            Verify & Auto-Assign
          </button>
        </div>
      )}

      {incident.status === 'verified' && (
        <button
          onClick={() => onAutoAssign(incident.id)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Send className="w-4 h-4" />
          Auto-Assign
        </button>
      )}
    </div>
  );
};

// Assignment Card
const AssignmentCard = ({ assignment, onUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const statusOptions = ['assigned', 'en_route', 'arrived', 'in_progress', 'resolved', 'cancelled'];

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await api.updateAssignmentStatus(assignment.id, newStatus, notes);
      setShowNotes(false);
      setNotes('');
      onUpdate();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-2">
            {assignment.incident_summary?.type} - {assignment.incident_summary?.severity}
          </h3>
          <p className="text-sm text-gray-600">{assignment.incident_summary?.location}</p>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
          {assignment.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500">Authority:</span>
          <span className="ml-2 font-medium">{assignment.authority_name}</span>
        </div>
        <div>
          <span className="text-gray-500">Assigned:</span>
          <span className="ml-2 font-medium">{new Date(assignment.assigned_at).toLocaleString()}</span>
        </div>
        {assignment.distance_km && (
          <div>
            <span className="text-gray-500">Distance:</span>
            <span className="ml-2 font-medium">{assignment.distance_km} km</span>
          </div>
        )}
        {assignment.estimated_arrival_min && (
          <div>
            <span className="text-gray-500">ETA:</span>
            <span className="ml-2 font-medium">{assignment.estimated_arrival_min} min</span>
          </div>
        )}
      </div>

      {assignment.status !== 'resolved' && assignment.status !== 'cancelled' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                disabled={updating}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm disabled:opacity-50 capitalize"
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showNotes ? 'Hide Notes' : 'Add Notes'}
            </button>
            {showNotes && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Add notes about this assignment..."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Media House Dashboard
const MediaDashboard = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const data = await api.listMediaIncidents();
      setIncidents(data.results || data || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMedia = async (mediaId, filename) => {
    try {
      const response = await api.downloadMedia(mediaId);
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Download failed');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'media-file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download media');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Verified Incidents</h1>
        <p className="text-gray-600">Browse and access verified emergency incidents</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading incidents...</div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No verified incidents available at this time
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {incidents.map((incident) => (
            <MediaIncidentCard
              key={incident.id}
              incident={incident}
              onView={() => setSelectedIncident(incident)}
            />
          ))}
        </div>
      )}

      {selectedIncident && (
        <MediaIncidentModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onDownload={handleDownloadMedia}
        />
      )}
    </div>
  );
};

// Media Incident Card
const MediaIncidentCard = ({ incident, onView }) => {
  const severityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800 capitalize">
              {incident.incident_type?.replace('_', ' ')}
            </h3>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{incident.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${severityColors[incident.severity]}`}>
          {incident.severity}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Verified
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div>
          <span className="font-medium">Location:</span>{' '}
          {incident.district && incident.region ? `${incident.district}, ${incident.region}` : 'Location available'}
        </div>
        <div>
          <span className="font-medium">Trust Score:</span>{' '}
          {incident.trust_score ? parseFloat(incident.trust_score).toFixed(2) : 'N/A'}
        </div>
      </div>

      <button
        onClick={onView}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        <Eye className="w-4 h-4" />
        View Details
      </button>
    </div>
  );
};

// Media Incident Modal
const MediaIncidentModal = ({ incident, onClose, onDownload }) => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidentDetails();
  }, [incident.id]);

  const loadIncidentDetails = async () => {
    try {
      const data = await api.getIncident(incident.id);
      setMediaFiles(data.media_files || []);
    } catch (err) {
      console.error('Failed to load incident details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Incident Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
            <p className="text-gray-600">{incident.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Type</h3>
              <p className="text-gray-600 capitalize">{incident.incident_type?.replace('_', ' ')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Severity</h3>
              <p className="text-gray-600 capitalize">{incident.severity}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Location</h3>
              <p className="text-gray-600">{incident.district}, {incident.region}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Reported</h3>
              <p className="text-gray-600">{new Date(incident.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Media Files</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading media files...</div>
            ) : mediaFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No media files available</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {mediaFiles.map((media) => (
                  <div key={media.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-800 capitalize">
                        {media.media_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Size: {(media.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={() => onDownload(media.id, `incident_${incident.id}_${media.media_type}`)}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const [view, setView] = useState('authorities');
  const [pendingAuthorities, setPendingAuthorities] = useState([]);
  const [pendingMedia, setPendingMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingApprovals();
      setPendingAuthorities(data.authorities || []);
      setPendingMedia(data.media_houses || []);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAuthority = async (id) => {
    try {
      await api.approveAuthority(id);
      loadPendingApprovals();
    } catch (err) {
      console.error('Failed to approve authority:', err);
    }
  };

  const handleApproveMedia = async (id) => {
    try {
      await api.approveMedia(id);
      loadPendingApprovals();
    } catch (err) {
      console.error('Failed to approve media house:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage pending registrations</p>
      </div>

      <div className="mb-6">
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setView('authorities')}
            className={`px-4 py-2 font-medium transition ${
              view === 'authorities'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Authorities ({pendingAuthorities.length})
          </button>
          <button
            onClick={() => setView('media')}
            className={`px-4 py-2 font-medium transition ${
              view === 'media'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Media Houses ({pendingMedia.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : view === 'authorities' ? (
        <div className="space-y-4">
          {pendingAuthorities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No pending authority approvals</div>
          ) : (
            pendingAuthorities.map((authority) => (
              <ApprovalCard
                key={authority.user.id}
                type="authority"
                data={authority}
                onApprove={() => handleApproveAuthority(authority.user.id)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {pendingMedia.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No pending media house approvals</div>
          ) : (
            pendingMedia.map((media) => (
              <ApprovalCard
                key={media.user.id}
                type="media"
                data={media}
                onApprove={() => handleApproveMedia(media.user.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Approval Card
const ApprovalCard = ({ type, data, onApprove }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 text-lg mb-2">
            {data.organization_name}
          </h3>
          <p className="text-gray-600">{data.user.full_name}</p>
        </div>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
          Pending
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500">Type:</span>
          <span className="ml-2 font-medium capitalize">
            {type === 'authority' ? data.authority_type : data.media_type}
          </span>
        </div>
        <div>
          <span className="text-gray-500">License:</span>
          <span className="ml-2 font-medium">{data.license_number}</span>
        </div>
        <div>
          <span className="text-gray-500">Phone:</span>
          <span className="ml-2 font-medium">{data.user.phone_number}</span>
        </div>
        <div>
          <span className="text-gray-500">Email:</span>
          <span className="ml-2 font-medium">{data.official_email}</span>
        </div>
        <div>
          <span className="text-gray-500">Region:</span>
          <span className="ml-2 font-medium">{data.region}</span>
        </div>
        <div>
          <span className="text-gray-500">{type === 'authority' ? 'District' : 'City'}:</span>
          <span className="ml-2 font-medium">{type === 'authority' ? data.district : data.city}</span>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-gray-500 text-sm">Address:</span>
        <p className="font-medium text-sm">{type === 'authority' ? data.station_address : data.address}</p>
      </div>

      <button
        onClick={onApprove}
        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
      >
        <CheckCircle className="w-4 h-4" />
        Approve
      </button>
    </div>
  );
};

// Main App Component
const App = () => {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return showRegister ? (
      <RegisterPage onBackClick={() => setShowRegister(false)} />
    ) : (
      <LoginPage onRegisterClick={() => setShowRegister(true)} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        {/* Sidebar for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1">
          {user.user_type === 'citizen' && <CitizenDashboard />}
          {user.user_type === 'authority' && <AuthorityDashboard />}
          {user.user_type === 'media' && <MediaDashboard />}
          {user.user_type === 'admin' && <AdminDashboard />}
        </main>
      </div>
    </div>
  );
};

// Root Component
const Root = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default Root;
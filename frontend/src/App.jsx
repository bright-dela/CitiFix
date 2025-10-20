// import React from "react";

// function App() {
//     return (
//         <div className="min-h-screen bg-gradient-tobr from-blue-500 to-purple-600 flex items-center justify-center">
//             <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
//                 <h1 className="text-4xl font-bold text-gray-800 mb-4">
//                     🚨 CitiFix
//                 </h1>
//                 <p className="text-gray-600 mb-4">
//                     Emergency Reporting System
//                 </p>
//                 <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
//                     ✅ Vite is working!
//                 </div>
//             </div>
//         </div>
//     );
// }

// export default App;


import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { AlertCircle, MapPin, Phone, Mail, User, Lock, Building, FileText, Plus, Bell, LogOut, Menu, X, Loader } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// API Configuration
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// Auth Service
const AuthService = {
  login: async (phone, password) => {
    const res = await fetch(`${API_BASE}/users/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone, password })
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    localStorage.setItem('token', data.access);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },
  
  register: async (userData) => {
    const res = await fetch(`${API_BASE}/users/register/citizen/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.phone_number?.[0] || 'Registration failed');
    }
    return res.json();
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getToken: () => localStorage.getItem('token'),
  getUser: () => JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: () => !!localStorage.getItem('token')
};

// API Service
const API = {
  getIncidents: async () => {
    const res = await fetch(`${API_BASE}/incidents/list/`, {
      headers: { 'Authorization': `Bearer ${AuthService.getToken()}` }
    });
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  },
  
  createIncident: async (data) => {
    const res = await fetch(`${API_BASE}/incidents/create/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create incident');
    return res.json();
  },
  
  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/notifications/`, {
      headers: { 'Authorization': `Bearer ${AuthService.getToken()}` }
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  }
};

// Custom marker icons
const incidentIcons = {
  fire: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  medical: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  crime: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  accident: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  disaster: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
};

// Map auto-center component
function MapAutoCenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);
  return null;
}

// Login Component
function LoginForm({ onLogin, onSwitchToRegister }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await AuthService.login(phone, password);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-red-100 rounded-full mb-4">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">CitiFix</h1>
          <p className="text-gray-600 mt-2">Emergency Reporting System</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="0201234567"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToRegister}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Don't have an account? Register
          </button>
        </div>
      </div>
    </div>
  );
}

// Register Component
function RegisterForm({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await AuthService.register({
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        email: formData.email || undefined,
        password: formData.password
      });
      alert('Registration successful! Please login.');
      onSwitchToLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
          <p className="text-gray-600 mt-2">Join CitiFix today</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="0201234567"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (Optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

// Report Incident Modal
function ReportIncidentModal({ onClose, onSuccess, userLocation }) {
  const [formData, setFormData] = useState({
    incident_type: 'fire',
    severity: 'medium',
    description: '',
    latitude: userLocation?.lat || '',
    longitude: userLocation?.lng || '',
    address: '',
    is_anonymous: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const getLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toFixed(8),
          longitude: position.coords.longitude.toFixed(8)
        });
        setGettingLocation(false);
      },
      (error) => {
        setError('Failed to get location. Please enter manually.');
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await API.createIncident(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Report Incident</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Incident Type
              </label>
              <select
                value={formData.incident_type}
                onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows="4"
              placeholder="Describe what happened..."
              maxLength={500}
              required
            />
            <p className="text-sm text-gray-500 mt-1">{formData.description.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Latitude"
                required
              />
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Longitude"
                required
              />
            </div>
            <button
              type="button"
              onClick={getLocation}
              disabled={gettingLocation}
              className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium flex items-center"
            >
              <MapPin className="w-4 h-4 mr-1" />
              {gettingLocation ? 'Getting location...' : 'Use my current location'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address (Optional)
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Street address or landmark"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="anonymous"
              checked={formData.is_anonymous}
              onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
              className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
              Report anonymously
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Dashboard
function Dashboard() {
  const [user] = useState(AuthService.getUser());
  const [incidents, setIncidents] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadIncidents();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        setUserLocation({ lat: 5.6037, lng: -0.1870 }); // Accra default
      }
    );
  };

  const loadIncidents = async () => {
    try {
      const data = await API.getIncidents();
      setIncidents(data.results || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async (incidentId) => {
    if (!window.confirm('Auto-assign this incident to the best available authority?')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/incidents/${incidentId}/auto-assign/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AuthService.getToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

    if (response.ok) {
      const data = await response.json();
      alert(data.message);
      loadIncidents(); // Refresh the list
    } else {
      const error = await response.json();
      alert(`Error: ${error.error}`);
    }
  } catch (err) {
    alert('Failed to auto-assign incident');
  }
};


  const handleLogout = () => {
    AuthService.logout();
    window.location.reload();
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      verified: 'bg-green-100 text-green-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const mapCenter = userLocation || { lat: 5.6037, lng: -0.1870 };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-800">CitiFix</h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.full_name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="md:hidden text-gray-700"
            >
              {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {showMenu && (
            <div className="md:hidden mt-4 pt-4 border-t">
              <div className="space-y-2">
                <p className="text-gray-700">Welcome, {user?.full_name}</p>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-2 text-red-600 bg-red-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Report Button */}
        <button
          onClick={() => setShowReportModal(true)}
          className="w-full mb-8 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg flex items-center justify-center"
        >
          <Plus className="w-6 h-6 mr-2" />
          Report New Incident
        </button>

        {/* Map */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Incident Map</h2>
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapAutoCenter position={userLocation ? [userLocation.lat, userLocation.lng] : null} />
              
              {incidents.map((incident) => (
                <Marker
                  key={incident.id}
                  position={[parseFloat(incident.location_latitude), parseFloat(incident.location_longitude)]}
                  icon={incidentIcons[incident.incident_type] || incidentIcons.fire}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-2 capitalize">
                        {incident.incident_type.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                      <div className="flex gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </div>
                      {incident.location_address && (
                        <p className="text-xs text-gray-500">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {incident.location_address}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(incident.created_at).toLocaleString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Incidents List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Incidents</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No incidents reported yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg capitalize">
                        {incident.incident_type.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Reported by: {incident.reporter_name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(incident.status)}`}>
                        {incident.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{incident.description}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {incident.location_address && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {incident.location_address}
                      </div>
                    )}
                    {incident.district && (
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-1" />
                        {incident.district}, {incident.region}
                      </div>
                    )}
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      {incident.media_count || 0} media files
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                    Reported: {new Date(incident.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <ReportIncidentModal
          onClose={() => setShowReportModal(false)}
          onSuccess={loadIncidents}
          userLocation={userLocation}
        />
      )}
    </div>
  );
}

// Main App Component
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [showRegister, setShowRegister] = useState(false);

  if (!isAuthenticated) {
    return showRegister ? (
      <RegisterForm
        onRegister={() => setIsAuthenticated(true)}
        onSwitchToLogin={() => setShowRegister(false)}
      />
    ) : (
      <LoginForm
        onLogin={() => setIsAuthenticated(true)}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  return <Dashboard />;
}
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const RegisterMediaHouse = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    company_name: '',
    registration_number: '',
    media_type: 'newspaper',
    press_license_number: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const mediaTypes = [
    { value: 'newspaper', label: 'Newspaper' },
    { value: 'tv', label: 'Television' },
    { value: 'radio', label: 'Radio' },
    { value: 'online', label: 'Online Media' },
    { value: 'other', label: 'Other' },
  ];
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await register(formData, 'media_house');
    
    if (result.success) {
      alert('Registration submitted! Please upload verification documents and wait for admin approval.');
      navigate('/media/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">
          Register as Media House
        </h2>
        
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
          Note: After registration, you'll need to upload verification documents and wait for admin approval.
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              type="text"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Media Type *
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.media_type}
                onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
              >
                {mediaTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Registration Number *"
              type="text"
              required
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
            />

            <Input
              label="Press License Number *"
              type="text"
              required
              value={formData.press_license_number}
              onChange={(e) => setFormData({ ...formData, press_license_number: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email *"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Phone"
              type="tel"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input
            label="Password * (min 8 characters)"
            type="password"
            required
            minLength={8}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            Register
          </Button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterMediaHouse;
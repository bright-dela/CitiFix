import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportAPI } from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const CreateReport = () => {
  const [formData, setFormData] = useState({
    report_type: 'fire',
    severity: 'medium',
    title: '',
    description: '',
    latitude: '',
    longitude: '',
    address: '',
    visibility: 'public',
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const reportTypes = [
    { value: 'fire', label: 'Fire Emergency' },
    { value: 'accident', label: 'Accident' },
    { value: 'crime', label: 'Crime' },
    { value: 'infrastructure', label: 'Infrastructure Issue' },
    { value: 'health', label: 'Health Emergency' },
    { value: 'other', label: 'Other' },
  ];
  
  const severityLevels = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];
  
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
        },
        (error) => {
          alert('Unable to get location: ' + error.message);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await reportAPI.createReport(formData);
      
      if (response.data.success) {
        const reportId = response.data.data.id;
        
        if (files.length > 0) {
          for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('file_type', file.type.startsWith('image/') ? 'image' : 'video');
            
            await reportAPI.uploadMedia(reportId, formData);
          }
        }
        
        alert('Report created successfully!');
        navigate('/citizen/my-reports');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Create Emergency Report</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Report Type *</label>
              <select
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.report_type}
                onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Severity *</label>
              <select
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                {severityLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Title *"
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Brief description of the emergency"
          />

          <div>
            <label className="block text-gray-700 mb-2">Description *</label>
            <textarea
              required
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the situation..."
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Location *</label>
            <div className="flex gap-2 mb-2">
              <Input
                type="number"
                step="any"
                required
                placeholder="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              />
              <Input
                type="number"
                step="any"
                required
                placeholder="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={getCurrentLocation}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              📍 Use My Current Location
            </button>
          </div>

          <Input
            label="Address *"
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Full address of the incident"
          />

          <div>
            <label className="block text-gray-700 mb-2">Visibility *</label>
            <select
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
            >
              <option value="public">Public (visible to all)</option>
              <option value="authorities_only">Authorities Only</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Attachments (Images/Videos)</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setFiles(Array.from(e.target.files))}
            />
            {files.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              className="flex-1"
            >
              Create Report
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/citizen/dashboard')}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReport;
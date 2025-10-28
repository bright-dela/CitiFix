import React, { useState, useEffect } from 'react';
import { reportAPI } from '../../services/api';
import ReportCard from '../../components/reports/ReportCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PublicReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    report_type: '',
    severity: '',
    search: ''
  });
  
  useEffect(() => {
    loadPublicReports();
  }, [filters]);
  
  const loadPublicReports = async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getReports({
        visibility: 'public',
        ...filters
      });
      
      if (response.data.success) {
        setReports(response.data.data.results || []);
      }
    } catch (error) {
      console.error('Failed to load public reports:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Public Emergency Reports</h1>
        <p className="text-gray-600 mt-2">
          Verified public reports for media coverage
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.report_type}
              onChange={(e) => handleFilterChange('report_type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="fire">Fire Emergency</option>
              <option value="accident">Accident</option>
              <option value="crime">Crime</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="health">Health Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search reports..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ report_type: '', severity: '', search: '' })}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">No public reports available</p>
          <p className="text-gray-400 text-sm mt-2">
            Public reports will appear here once they are verified and marked as public
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map(report => (
            <ReportCard 
              key={report.id} 
              report={report}
              showActions={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicReports;
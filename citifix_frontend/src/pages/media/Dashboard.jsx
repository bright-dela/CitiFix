import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { reportAPI } from '../../services/api';
import ReportCard from '../../components/reports/ReportCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const MediaDashboard = () => {
  const { user } = useAuth();
  const { realtimeData } = useWebSocket();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    today: 0
  });
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  useEffect(() => {
    if (realtimeData.reports.length > 0) {
      setReports(realtimeData.reports.slice(0, 3));
    }
  }, [realtimeData]);
  
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getReports({ visibility: 'public', limit: 6 });
      
      if (response.data.success) {
        const publicReports = response.data.data.results || [];
        setReports(publicReports);
        
        const critical = publicReports.filter(r => r.severity === 'critical').length;
        const today = new Date().toDateString();
        const todayReports = publicReports.filter(r =>
          new Date(r.created_at).toDateString() === today
        ).length;
        
        setStats({
          total: publicReports.length,
          critical,
          today: todayReports
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Media Dashboard - {user.media_profile?.company_name}
        </h1>
        <p className="text-gray-600 mt-2">
          Access to verified public emergency reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium mb-1">Total Reports</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <h3 className="text-gray-500 text-sm font-medium mb-1">Critical Incidents</h3>
          <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium mb-1">Today's Reports</h3>
          <p className="text-3xl font-bold text-green-600">{stats.today}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">Recent Public Reports</h2>
        
        {reports.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No public reports available</p>
            <p className="text-gray-400 text-sm mt-2">
              Public reports will appear here once they are verified and marked as public
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.slice(0, 6).map(report => (
              <ReportCard key={report.id} report={report} showActions={false} />
            ))}
          </div>
        )}
        
        {reports.length > 6 && (
          <div className="mt-6 text-center">
            <button 
              onClick={() => window.location.href = '/media/reports'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              View All Reports
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaDashboard;
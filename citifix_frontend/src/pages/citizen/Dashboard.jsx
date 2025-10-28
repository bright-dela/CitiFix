import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { reportAPI } from '../../services/api';
import ReportCard from '../../components/reports/ReportCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const { realtimeData } = useWebSocket();
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 });
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (realtimeData.reports.length > 0) {
      setRecentReports(realtimeData.reports.slice(0, 3));
    }
  }, [realtimeData]);

  const fetchDashboardData = async () => {
    try {
      const response = await reportAPI.getMyReports({ limit: 5 });
      if (response.data.success) {
        const reports = response.data.data.results;
        setRecentReports(reports);
        
        const total = response.data.data.pagination?.total || reports.length;
        const active = reports.filter(r => 
          ['reported', 'assigned', 'in_progress'].includes(r.status)
        ).length;
        const resolved = reports.filter(r => r.status === 'resolved').length;
        setStats({ total, active, resolved });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome, {user.profile?.first_name} {user.profile?.last_name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's an overview of your emergency reports
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Total Reports</p>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="text-blue-500 text-2xl">📋</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Active Reports</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.active}</p>
            </div>
            <div className="text-yellow-500 text-2xl">🔄</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Resolved Reports</p>
              <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <div className="text-green-500 text-2xl">✅</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Recent Reports</h2>
        <Link 
          to="/citizen/create-report" 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Create New Report
        </Link>
      </div>

      {recentReports.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg mb-4">No reports yet</p>
          <p className="text-gray-400 mb-6">Create your first emergency report to get started</p>
          <Link 
            to="/citizen/create-report" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Report
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentReports.slice(0, 3).map(report => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {recentReports.length > 3 && (
        <div className="mt-8 text-center">
          <Link 
            to="/citizen/my-reports" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Reports →
          </Link>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
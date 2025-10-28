import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { reportAPI } from '../../services/api';
import ReportCard from '../../components/reports/ReportCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const AuthorityDashboard = () => {
  const { user } = useAuth();
  const { realtimeData, notifications } = useWebSocket();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    resolved: 0,
    critical: 0
  });
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (realtimeData.reports.length > 0) {
      setRecentReports(realtimeData.reports.slice(0, 3));
      updateStats(realtimeData.reports);
    }
  }, [realtimeData]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [assignedResponse, allResponse] = await Promise.all([
        reportAPI.getAssignedReports({ limit: 5 }),
        reportAPI.getReports({ limit: 10 })
      ]);

      if (assignedResponse.data.success) {
        const reports = assignedResponse.data.data.results || [];
        setRecentReports(reports);
        updateStats(reports);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (reports) => {
    const total = reports.length;
    const active = reports.filter(r => 
      ['assigned', 'in_progress'].includes(r.status)
    ).length;
    const resolved = reports.filter(r => r.status === 'resolved').length;
    const critical = reports.filter(r => r.severity === 'critical').length;

    setStats({ total, active, resolved, critical });
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      await reportAPI.updateStatus(reportId, newStatus);
      // The real-time update will refresh the data via WebSocket
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update report status');
    }
  };

  if (user?.status === 'pending') {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-yellow-600 mb-4">
            Account Pending Verification
          </h1>
          <p className="text-gray-600 mb-6">
            Your authority account is awaiting admin verification. 
            Please upload your verification documents to complete the approval process.
          </p>
          <div className="space-y-4 text-left bg-white p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Required Documents:</h3>
            <ul className="space-y-2 text-gray-600">
              <li>✅ Official license or certification</li>
              <li>✅ Organization registration documents</li>
              <li>✅ Government-issued ID proof</li>
              <li>✅ Accreditation certificates (if any)</li>
            </ul>
          </div>
          <div className="mt-8">
            <a
              href="/authority/upload-documents"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Upload Verification Documents
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Authority Dashboard - {user.authority_profile?.organization_name}
        </h1>
        <p className="text-gray-600 mt-2">
          Manage emergency reports and coordinate responses
        </p>
      </div>

      {/* Real-time Alert Banner */}
      {notifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">🔔</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {notifications.length} new notification(s)
              </h3>
              <p className="text-sm text-blue-600 mt-1">
                Check for new emergency reports and updates
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Total Assigned</p>
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
              <p className="text-gray-500 text-sm font-medium mb-1">Resolved</p>
              <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <div className="text-green-500 text-2xl">✅</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Critical</p>
              <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <div className="text-red-500 text-2xl">🚨</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Assigned Reports */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Assigned Reports</h2>
            <a 
              href="/authority/assigned-reports"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </a>
          </div>

          {recentReports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No reports assigned to you yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Reports will appear here when assigned by administrators
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReports.slice(0, 3).map(report => (
                <ReportCard 
                  key={report.id} 
                  report={report}
                  showActions={true}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <a
              href="/authority/assigned-reports"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">View All Assigned Reports</h3>
                <p className="text-sm text-gray-500">Manage all reports assigned to your authority</p>
              </div>
            </a>

            <a
              href="/authority/upload-documents"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-xl">📎</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">Manage Documents</h3>
                <p className="text-sm text-gray-500">Update verification documents</p>
              </div>
            </a>

            <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-xl">🏢</span>
              </div>
              <div className="ml-4">
                <h3 className="font-medium text-gray-900">Organization Info</h3>
                <p className="text-sm text-gray-500">
                  {user.authority_profile?.organization_name} • {user.authority_profile?.authority_type}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Jurisdiction: {user.authority_profile?.jurisdiction_area}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
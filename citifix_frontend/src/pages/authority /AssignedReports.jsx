import React, { useState, useEffect } from 'react';
import { reportAPI } from '../../services/api';
import ReportCard from '../../components/reports/ReportCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';

const AssignedReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    report_type: '',
    search: ''
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchAssignedReports();
  }, [filters]);

  const fetchAssignedReports = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.getAssignedReports(filters);
      if (response.data.success) {
        setReports(response.data.data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch assigned reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      await reportAPI.updateStatus(reportId, newStatus);
      // Refresh the list to show updated status
      fetchAssignedReports();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update report status');
    }
  };

  const handleAddNote = async (reportId) => {
    if (!note.trim()) {
      alert('Please enter a note');
      return;
    }

    try {
      await reportAPI.addNote(reportId, note);
      setNote('');
      setSelectedReport(null);
      alert('Note added successfully');
      fetchAssignedReports();
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('Failed to add note');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStatusCounts = () => {
    const counts = {
      reported: 0,
      assigned: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };

    reports.forEach(report => {
      counts[report.status] = (counts[report.status] || 0) + 1;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Assigned Reports</h1>
        <p className="text-gray-600 mt-2">
          Manage emergency reports assigned to your authority
        </p>
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Report Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{count}</div>
              <div className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="reported">Reported</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
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
              Type
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

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', severity: '', report_type: '', search: '' })}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="text"
            placeholder="Search reports by title or description..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">No assigned reports found</p>
          <p className="text-gray-400 text-sm mt-2">
            {Object.values(filters).some(f => f) 
              ? 'Try changing your filters' 
              : 'Reports will appear here when assigned by administrators'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <ReportCard 
                report={report}
                showActions={true}
                onStatusChange={handleStatusChange}
              />
              
              {/* Action Buttons */}
              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex flex-wrap gap-3">
                  <select
                    value={report.status}
                    onChange={(e) => handleStatusChange(report.id, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="reported">Reported</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                  >
                    {selectedReport?.id === report.id ? 'Cancel' : 'Add Note'}
                  </Button>

                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => {
                      // View report details - could be expanded to a modal
                      alert(`Report Details:\n\nTitle: ${report.title}\nDescription: ${report.description}\nStatus: ${report.status}\nSeverity: ${report.severity}`);
                    }}
                  >
                    View Details
                  </Button>
                </div>

                {/* Add Note Form */}
                {selectedReport?.id === report.id && (
                  <div className="mt-4 p-4 bg-white border rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Internal Note
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter internal notes about this report..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => handleAddNote(report.id)}
                        disabled={!note.trim()}
                      >
                        Save Note
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedReport(null);
                          setNote('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Logs */}
                {report.action_logs && report.action_logs.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {report.action_logs.slice(0, 3).map((log) => (
                        <div key={log.id} className="text-xs text-gray-600 border-l-2 border-blue-500 pl-2">
                          <span className="font-medium">{log.actor_email}:</span> {log.description}
                          <div className="text-gray-400">{new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignedReports;
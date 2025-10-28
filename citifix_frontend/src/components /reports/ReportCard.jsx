import React from 'react';

const ReportCard = ({ report, showActions = false, onStatusChange }) => {
  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };
  
  const getStatusColor = (status) => {
    const colors = {
      reported: 'bg-blue-100 text-blue-800',
      assigned: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{report.title}</h3>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(report.severity)}`}>
            {report.severity}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
            {report.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-2">{report.description}</p>

      <div className="space-y-2 text-sm text-gray-500 mb-4">
        <p><strong>Type:</strong> {report.report_type}</p>
        <p><strong>Location:</strong> {report.address}</p>
        <p><strong>Reported:</strong> {formatDate(report.created_at)}</p>
        {report.assigned_to_organization && (
          <p><strong>Assigned to:</strong> {report.assigned_to_organization}</p>
        )}
      </div>

      {report.media_attachments && report.media_attachments.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            📎 {report.media_attachments.length} attachment(s)
          </p>
        </div>
      )}

      {showActions && onStatusChange && (
        <div className="flex gap-2 mt-4">
          <select
            value={report.status}
            onChange={(e) => onStatusChange(report.id, e.target.value)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="reported">Reported</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default ReportCard;
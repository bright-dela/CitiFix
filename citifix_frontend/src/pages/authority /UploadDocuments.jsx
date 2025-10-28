import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { documentAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const UploadDocuments = () => {
  const { user, updateUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    document_type: 'license',
    document_name: '',
    document_file: null,
  });

  const documentTypes = [
    { value: 'license', label: 'Official License' },
    { value: 'registration', label: 'Registration Certificate' },
    { value: 'id_proof', label: 'Government ID Proof' },
    { value: 'accreditation', label: 'Accreditation Certificate' },
    { value: 'other', label: 'Other Document' },
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await documentAPI.getMyDocuments();
      if (response.data.success) {
        setDocuments(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.document_file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('document_type', uploadData.document_type);
    formData.append('document_name', uploadData.document_name || uploadData.document_file.name);
    formData.append('document_file', uploadData.document_file);

    try {
      const response = await documentAPI.upload(formData);
      if (response.data.success) {
        alert('Document uploaded successfully!');
        setUploadData({ document_type: 'license', document_name: '', document_file: null });
        fetchDocuments();
        updateUser();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentAPI.deleteDocument(documentId);
      alert('Document deleted successfully!');
      fetchDocuments();
    } catch (error) {
      alert('Failed to delete document');
    }
  };

  const getDocumentTypeLabel = (type) => {
    const docType = documentTypes.find(doc => doc.value === type);
    return docType ? docType.label : type;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Verification Documents</h1>
          <p className="text-gray-600 mt-2">
            Upload required documents for authority account verification
          </p>
        </div>

        {/* Status Alert */}
        {user?.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 text-sm">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-yellow-800">
                  Account Pending Verification
                </h3>
                <p className="text-yellow-700 mt-1">
                  Your account is under review. Please upload all required documents to complete verification.
                  You'll be notified once your account is approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {user?.status === 'active' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-green-800">
                  Account Verified
                </h3>
                <p className="text-green-700 mt-1">
                  Your authority account has been verified and is active. 
                  You can still manage your documents below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Required Documents Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Required Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Mandatory Documents:</h4>
              <ul className="space-y-1 text-blue-600">
                <li>• Official operating license</li>
                <li>• Organization registration certificate</li>
                <li>• Head officer government ID</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Additional Documents:</h4>
              <ul className="space-y-1 text-blue-600">
                <li>• Accreditation certificates</li>
                <li>• Insurance documents</li>
                <li>• Any other relevant certifications</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-500">
            <p>📁 Supported formats: PDF, JPG, PNG, DOC, DOCX</p>
            <p>💾 Maximum file size: 10MB per document</p>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload New Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Document Type *</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={uploadData.document_type}
                  onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Document Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional - will use filename if not provided"
                  value={uploadData.document_name}
                  onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Select File *</label>
              <input
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setUploadData({ ...uploadData, document_file: e.target.files[0] })}
              />
              {uploadData.document_file && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {uploadData.document_file.name} 
                  ({(uploadData.document_file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <Button
              type="submit"
              loading={uploading}
              disabled={uploading || !uploadData.document_file}
              className="w-full"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </form>
        </div>

        {/* Uploaded Documents */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Uploaded Documents ({documents.length})
            </h2>
            {documents.length > 0 && (
              <button
                onClick={fetchDocuments}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Refresh
              </button>
            )}
          </div>
          
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">📄</div>
              <p className="text-gray-500 text-lg">No documents uploaded yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Upload your verification documents to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">📎</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{doc.document_name}</p>
                      <p className="text-sm text-gray-500">
                        Type: {getDocumentTypeLabel(doc.document_type)} • 
                        Size: {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-gray-400">
                        Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      View
                    </a>
                    {user?.status === 'pending' && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification Status */}
          {user?.status === 'pending' && documents.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-yellow-600">ℹ️</span>
                </div>
                <div className="ml-3">
                  <p className="text-yellow-700 text-sm">
                    <strong>Note:</strong> Your documents are under review. 
                    You can still upload additional documents or replace existing ones until your account is verified.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadDocuments;
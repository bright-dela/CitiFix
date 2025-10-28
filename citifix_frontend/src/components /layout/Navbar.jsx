import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold">
            CitiFix
          </Link>

          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <span className="text-sm">
                  {user.email} ({user.user_type})
                </span>
                
                {user.user_type === 'citizen' && (
                  <>
                    <Link to="/citizen/dashboard" className="hover:text-blue-200">
                      Dashboard
                    </Link>
                    <Link to="/citizen/create-report" className="hover:text-blue-200">
                      Create Report
                    </Link>
                    <Link to="/citizen/my-reports" className="hover:text-blue-200">
                      My Reports
                    </Link>
                  </>
                )}

                {user.user_type === 'authority' && (
                  <>
                    <Link to="/authority/dashboard" className="hover:text-blue-200">
                      Dashboard
                    </Link>
                    <Link to="/authority/assigned-reports" className="hover:text-blue-200">
                      Assigned Reports
                    </Link>
                    {user.status === 'pending' && (
                      <Link to="/authority/upload-documents" className="hover:text-blue-200 bg-yellow-500 px-3 py-1 rounded">
                        Upload Documents
                      </Link>
                    )}
                  </>
                )}

                {user.user_type === 'media_house' && (
                  <>
                    <Link to="/media/dashboard" className="hover:text-blue-200">
                      Dashboard
                    </Link>
                    <Link to="/media/reports" className="hover:text-blue-200">
                      Public Reports
                    </Link>
                  </>
                )}

                {user.user_type === 'superadmin' && (
                  <>
                    <Link to="/admin/dashboard" className="hover:text-blue-200">
                      Dashboard
                    </Link>
                    <Link to="/admin/pending-verifications" className="hover:text-blue-200">
                      Pending Verifications
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-blue-200">
                  Login
                </Link>
                <div className="flex space-x-2">
                  <Link to="/register/citizen" className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-blue-50">
                    Register as Citizen
                  </Link>
                  <Link to="/register/authority" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                    Apply as Authority
                  </Link>
                  <Link to="/register/media" className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
                    Apply as Media
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
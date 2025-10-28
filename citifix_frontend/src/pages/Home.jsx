import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Home = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-blue-600 mb-4">
            Welcome to CitiFix
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Emergency Reporting System for Safer Communities
          </p>

          {!user ? (
            <div className="flex justify-center gap-4 flex-wrap">
              <Link
                to="/register/citizen"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold transition-colors"
              >
                Get Started as Citizen
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 text-lg font-semibold transition-colors"
              >
                Login
              </Link>
            </div>
          ) : (
            <Link
              to={`/${user.user_type}/dashboard`}
              className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold transition-colors"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">Report Emergencies</h3>
            <p className="text-gray-600">
              Citizens can quickly report fires, accidents, crimes, and other emergencies with location and media attachments.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-4">🚨</div>
            <h3 className="text-xl font-semibold mb-2">Instant Notification</h3>
            <p className="text-gray-600">
              Authorities are immediately notified and can respond quickly to critical situations.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-gray-600">
              Monitor report status in real-time from submission to resolution.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Register As</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-2xl font-semibold mb-4">👤 Citizen</h3>
            <p className="text-gray-600 mb-4">
              Report emergencies, track your reports, and help make your community safer.
            </p>
            <Link
              to="/register/citizen"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Register Now
            </Link>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-2xl font-semibold mb-4">🚔 Authority</h3>
            <p className="text-gray-600 mb-4">
              Receive reports, manage emergencies, and coordinate responses effectively.
            </p>
            <Link
              to="/register/authority"
              className="inline-block px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Apply Now
            </Link>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="text-2xl font-semibold mb-4">📰 Media House</h3>
            <p className="text-gray-600 mb-4">
              Access verified emergency reports for accurate news coverage.
            </p>
            <Link
              to="/register/media"
              className="inline-block px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
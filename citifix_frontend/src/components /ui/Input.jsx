import React from 'react';

const Input = ({ label, error, ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-gray-700 text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;
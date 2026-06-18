/**
 * Error Message Component
 */

import React from 'react';

function ErrorMessage({ message, onRetry }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">❌</div>
      <h3 className="text-xl font-bold text-gray-700 mb-2">
        Oops! Something went wrong
      </h3>
      <p className="text-gray-600 mb-4 max-w-md mx-auto">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
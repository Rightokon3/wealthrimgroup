'use client'


export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">You're offline</h1>
        <p className="text-gray-400 text-sm mb-6">
          Check your internet connection and try again. Drovo needs a connection to show you stores and process orders.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-2xl text-sm hover:from-orange-600 hover:to-red-700 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
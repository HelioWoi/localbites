import React, { useEffect } from 'react';

const LiveExamplesPage: React.FC = () => {
  useEffect(() => {
    // Redirect directly to Backstreet Cafe demo route (shows rotating banners + back button)
    window.location.href = '/demo/backstreet-cafe';
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <p className="text-white text-lg">Redirecting to live example...</p>
    </div>
  );
};

export default LiveExamplesPage;

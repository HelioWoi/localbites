import React, { useEffect } from 'react';

const LiveExamplesPage: React.FC = () => {
  useEffect(() => {
    // Redirect directly to Backstreet Cafe demo menu (video feed)
    window.location.href = '/demo/backstreet-cafe/menu';
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <p className="text-white text-lg">Redirecting to live example...</p>
    </div>
  );
};

export default LiveExamplesPage;

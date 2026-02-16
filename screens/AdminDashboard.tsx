
import React, { useState } from 'react';
import { X, Check, Plus } from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState(1);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setStep(2);
    }, 2000);
  };

  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col text-white">
      <div className="p-6 pt-12 flex justify-between items-center border-b border-zinc-900">
        <h1 className="text-xl font-bold">Restaurant Portal</h1>
        <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full"><X size={20}/></button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-8">
        {step === 1 ? (
          <>
            <section>
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Your Content</h2>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleUpload}
                  className="aspect-square bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-orange-500 transition-colors"
                >
                  <Plus className="text-zinc-500" />
                  <span className="text-xs font-bold text-zinc-500">Add Video</span>
                </button>
                <div className="aspect-square bg-zinc-900 rounded-2xl overflow-hidden relative">
                  <img src="https://picsum.photos/seed/food1/300/300" className="w-full h-full object-cover opacity-50" />
                  <div className="absolute top-2 right-2 bg-green-500 p-1 rounded-full"><Check size={12} /></div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Details</h2>
              <div>
                <label className="text-xs font-bold text-zinc-600 mb-2 block">Restaurant Name</label>
                <input type="text" defaultValue="Mamma Mia's" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600 mb-2 block">Cuisine</label>
                <select className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm appearance-none text-white">
                  <option>Italian</option>
                  <option>Japanese</option>
                  <option>Mexican</option>
                </select>
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
              <Check size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Content Published</h2>
            <p className="text-zinc-500 mb-8 max-w-xs">Your video is now live in the MenuLove feed for users nearby.</p>
            <button 
              onClick={() => setStep(1)}
              className="px-8 py-4 bg-white text-black font-bold rounded-2xl"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-[100] p-12 text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6" />
          <h3 className="text-xl font-bold mb-2">Analysing Video</h3>
          <p className="text-zinc-400 text-sm">Gemini is extracting dish details and verifying quality...</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

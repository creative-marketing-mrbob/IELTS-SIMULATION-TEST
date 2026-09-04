import React from 'react';
import { useTest } from '../context/TestContext';
import { ArrowLeft } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentView, setCurrentView } = useTest();
  const isStaffView = currentView === 'admin' || currentView === 'tutor' || currentView === 'database';

  return (
    <header className="sticky top-0 z-50 border-b border-[#e6eaf2] bg-white shadow-sm shadow-slate-900/5 transition-all select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo */}
          <div 
            onClick={() => setCurrentView('register')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <img
              src="/logo-mrbob%202.png"
              alt="IELTS Simulation"
              className="h-11 w-auto max-w-[120px] object-contain"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-base sm:text-xl text-slate-950 tracking-tight">IELTS SIMULATION TEST</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Online Diagnostic</p>
            </div>
          </div>

          {/* Right: Portal status / Exit */}
          <div>
            {isStaffView ? (
              <button
                onClick={() => setCurrentView('register')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Candidate View</span>
              </button>
            ) : (
              <div className="inline-flex items-center rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-red-500 ring-1 ring-red-100">
                FREE
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

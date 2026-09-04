import React from 'react';
import { TestProvider, useTest } from './context/TestContext';
import { Navbar } from './components/Navbar';
import { RegistrationPage } from './components/RegistrationPage';
import { AccessInfoScreen } from './components/AccessInfoScreen';
import { TestDashboard } from './components/TestDashboard';
import { TestInterface } from './components/TestInterface/TestInterface';
import { ResultPage } from './components/ResultPage';
import { AdminDashboard } from './components/AdminDashboard';
import { TutorDashboard } from './components/TutorDashboard';
import { Footer } from './components/Footer';

const AppContent: React.FC = () => {
  const { currentView } = useTest();

  // Test mode renders full landscape computer-delivered interface
  if (currentView === 'test') {
    return <TestInterface />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-600 selection:text-white">
      <Navbar />
      
      <main className="flex-1">
        {currentView === 'register' && <RegistrationPage />}
        {currentView === 'access-info' && <AccessInfoScreen />}
        {currentView === 'dashboard' && <TestDashboard />}
        {currentView === 'result' && <ResultPage />}
        {currentView === 'admin' && <AdminDashboard mode="followup" />}
        {currentView === 'database' && <AdminDashboard mode="database" />}
        {currentView === 'tutor' && <TutorDashboard />}
      </main>

      {currentView !== 'tutor' && currentView !== 'admin' && currentView !== 'database' && <Footer />}
    </div>
  );
};

export function App() {
  return (
    <TestProvider>
      <AppContent />
    </TestProvider>
  );
}

export default App;

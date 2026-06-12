import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import Header from './components/common/Header';
import BadgeToast from './components/Badges/BadgeToast';
import LandingPage from './pages/LandingPage';
import LevelMap from './components/LevelMap/LevelMap';
import GamePage from './pages/GamePage';
import BadgesGrid from './components/Badges/BadgesGrid';

function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/map" element={<LevelMap />} />
          <Route path="/play/:levelId" element={<GamePage />} />
          <Route path="/badges" element={<BadgesGrid />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BadgeToast />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProgressProvider>
          <AppShell />
        </ProgressProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

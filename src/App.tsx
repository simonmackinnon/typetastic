import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import MobileBanner from './components/common/MobileBanner';
import BadgeToast from './components/Badges/BadgeToast';
import LandingPage from './pages/LandingPage';
import LevelMap from './components/LevelMap/LevelMap';
import GamePage from './pages/GamePage';
import BadgesGrid from './components/Badges/BadgesGrid';
import TutorialsPage from './pages/TutorialsPage';
import AboutPage from './pages/AboutPage';
import CallbackPage from './pages/CallbackPage';
import PrivacyPage from './pages/PrivacyPage';

// Forces GamePage to fully remount (resetting all state) when the level changes
function KeyedGamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  return <GamePage key={levelId} />;
}

function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50 font-body flex flex-col">
      <Header />
      <MobileBanner />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/map" element={<LevelMap />} />
          <Route path="/play/:levelId" element={<KeyedGamePage />} />
          <Route path="/badges" element={<BadgesGrid />} />
          <Route path="/tutorials" element={<TutorialsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BadgeToast />
      <Footer />
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

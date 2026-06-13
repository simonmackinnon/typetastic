import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import BadgeToast from './components/Badges/BadgeToast';
import LandingPage from './pages/LandingPage';
import LevelMap from './components/LevelMap/LevelMap';
import GamePage from './pages/GamePage';
import BadgesGrid from './components/Badges/BadgesGrid';
import TutorialsPage from './pages/TutorialsPage';

// Forces GamePage to fully remount (resetting all state) when the level changes
function KeyedGamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  return <GamePage key={levelId} />;
}

function MobileGate() {
  return (
    <div className="md:hidden fixed inset-0 z-[100] flex flex-col items-center justify-center text-center p-8
                    bg-gradient-to-b from-purple-600 via-pink-500 to-orange-400 text-white">
      <div className="text-7xl mb-6">⌨️</div>
      <h2 className="font-display text-4xl mb-4">TypeStar needs a keyboard!</h2>
      <p className="font-body text-lg text-white/90 max-w-xs leading-relaxed">
        This app is designed for desktop or laptop computers with a physical keyboard.
      </p>
      <p className="font-body text-base text-white/70 mt-4 max-w-xs">
        Come back on a bigger screen and start your typing adventure!
      </p>
    </div>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50 font-body flex flex-col">
      <MobileGate />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/map" element={<LevelMap />} />
          <Route path="/play/:levelId" element={<KeyedGamePage />} />
          <Route path="/badges" element={<BadgesGrid />} />
          <Route path="/tutorials" element={<TutorialsPage />} />
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

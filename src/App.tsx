import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { TranslationProvider } from "./contexts/TranslationContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import { ReactNode } from "react";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Pages
import Home from "./pages/Home";
import Tournaments from "./pages/Tournaments";
import TournamentDetails from "./pages/TournamentDetails";
import Rankings from "./pages/Rankings";
import TeamFinder from "./pages/TeamFinder";
import Profile from "./pages/Profile";
import Teams from "./pages/Teams";
import Team from "./pages/Team";
import Joukkuehaku from "./pages/Joukkuehaku";
import Watch from "./pages/Watch";
import Auth from "./pages/Auth";
import LinkFaceitTeam from "./pages/LinkFaceitTeam";
import NotFound from "./pages/NotFound";
import AdminTournaments from "./pages/AdminTournaments";

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <TranslationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route
                  path="/tournaments/:id"
                  element={<TournamentDetails />}
                />
                <Route
                  path="/tournaments/:id/link-faceit-team"
                  element={<LinkFaceitTeam />}
                />
                <Route path="/rankings" element={<Rankings />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/teams/:id" element={<Team />} />
                <Route path="/joukkuehaku" element={<Joukkuehaku />} />
                <Route path="/players" element={<Rankings />} />
                <Route path="/teamfinder" element={<TeamFinder />} />
                <Route path="/watch" element={<Watch />} />
                <Route
                  path="/admin/tournaments"
                  element={
                    <AdminRoute>
                      <AdminTournaments />
                    </AdminRoute>
                  }
                />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/register" element={<Auth />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </TranslationProvider>
  );
}

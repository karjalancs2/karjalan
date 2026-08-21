import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TranslationProvider } from "./contexts/TranslationContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";

// Pages
import Home from "./pages/Home";
import Tournaments from "./pages/Tournaments";
import TournamentDetails from "./pages/TournamentDetails";
import Rankings from "./pages/Rankings";
import TeamFinder from "./pages/TeamFinder";
import Profile from "./pages/Profile";
import Teams from "./pages/Teams";
import Team from "./pages/Team";
import Watch from "./pages/Watch";
import Auth from "./pages/Auth";
import LinkFaceitTeam from "./pages/LinkFaceitTeam";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <TranslationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/:id" element={<TournamentDetails />} />
              <Route
                path="/tournaments/:id/link-faceit-team"
                element={<LinkFaceitTeam />}
              />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:id" element={<Team />} />
              <Route path="/players" element={<Rankings />} />
              <Route path="/teamfinder" element={<TeamFinder />} />
              <Route path="/watch" element={<Watch />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </TranslationProvider>
  );
}

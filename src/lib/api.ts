import {
  User,
  Team,
  Tournament,
  Match,
  TeamLobby,
  RankingEntry,
} from "../types";
import { apiFetch } from "./http";

function apiError(message: string, status: number) {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

export const mockUsers: User[] = [
  {
    id: "u1",
    username: "Samuel",
    country: "FI",
    faceitLevel: 9,
    faceitUsername: "SamuelFI",
    role: "Rifler",
    teamId: "t1",
  },
  {
    id: "u2",
    username: "Jere",
    country: "FI",
    faceitLevel: 8,
    faceitUsername: "JereGod",
    role: "Entry",
    teamId: "t1",
  },
  {
    id: "u3",
    username: "Mika",
    country: "FI",
    faceitLevel: 10,
    faceitUsername: "MikaAWP",
    role: "AWPer",
    teamId: "t1",
  },
  {
    id: "u4",
    username: "Ville",
    country: "FI",
    faceitLevel: 9,
    faceitUsername: "VilleCS",
    role: "Support",
    teamId: "t1",
  },
  {
    id: "u5",
    username: "Aleksi",
    country: "FI",
    faceitLevel: 10,
    faceitUsername: "Allu",
    role: "IGL",
    teamId: "t2",
  },
  {
    id: "u6",
    username: "Elias",
    country: "FI",
    faceitLevel: 7,
    faceitUsername: "EliasZ",
    role: "Rifler",
  },
];

export const mockTeams: Team[] = [
  {
    id: "t1",
    name: "Helsinki Wolves",
    country: "FI",
    captainId: "u1",
    playerIds: ["u1", "u2", "u3", "u4"],
    rankingPoints: 1842,
    wins: 32,
    losses: 18,
    prizeWinnings: 750,
  },
  {
    id: "t2",
    name: "Espoo Eagles",
    country: "FI",
    captainId: "u5",
    playerIds: ["u5"],
    rankingPoints: 1799,
    wins: 28,
    losses: 20,
    prizeWinnings: 500,
  },
  {
    id: "t3",
    name: "Tampere Titans",
    country: "FI",
    captainId: "u6",
    playerIds: [],
    rankingPoints: 1744,
    wins: 25,
    losses: 22,
    prizeWinnings: 300,
  },
];

export const mockTournaments: Tournament[] = [
  {
    id: "tr1",
    name: "Karjalan CS2 Cup #1",
    status: "registration",
    date: "2026-10-31",
    prizePool: 50,
    teamCapacity: 64,
    registeredTeamsCount: 32,
    entryFee: 0,
    format: "Single Elimination",
    registrationDeadline: "2026-10-30T23:59:59Z",
  },
  {
    id: "tr2",
    name: "Karjalan CS2 Cup #2",
    status: "registration",
    date: "2026-08-29",
    prizePool: 500,
    teamCapacity: 64,
    registeredTeamsCount: 32,
    entryFee: 10,
    format: "Single Elimination",
    registrationDeadline: "2026-08-28T23:59:59Z",
  },
];

export const mockMatches: Match[] = [
  {
    id: "m1",
    tournamentId: "tr1",
    round: "Quarterfinal",
    team1Id: "t1",
    team2Id: "t2",
    team1Score: 0,
    team2Score: 0,
    map: "Mirage",
    status: "upcoming",
    scheduledTime: "2026-10-31T18:00:00Z",
    streamUrl: "https://twitch.tv/karjalan",
    faceitMatchId: "1-faceit-match-id-example",
  },
];

export const mockLobbies: TeamLobby[] = [
  {
    id: "l1",
    tournamentId: "tr2",
    name: "Helsinki Mix",
    captainId: "u1",
    status: "forming",
    description: "Etsitään viidettä pelaajaa rifleriksi.",
    slots: [
      { id: "s1", playerId: "u1", status: "occupied" },
      { id: "s2", playerId: "u2", status: "occupied" },
      { id: "s3", playerId: "u3", status: "occupied" },
      { id: "s4", playerId: "u4", status: "occupied" },
      { id: "s5", status: "empty", requestedRole: "Rifler", minFaceitLevel: 8 },
    ],
  },
  {
    id: "l2",
    tournamentId: "tr2",
    name: "Tampere Grind",
    captainId: "u6",
    status: "forming",
    description: "Rento meininki, mutta voittoa haetaan.",
    slots: [
      { id: "s1", playerId: "u6", status: "occupied" },
      { id: "s2", status: "empty" },
      { id: "s3", status: "empty" },
      { id: "s4", status: "empty" },
      { id: "s5", status: "empty" },
    ],
  },
];

export const mockRankings: RankingEntry[] = [
  { rank: 1, teamId: "t1", points: 1842, change: 2 },
  { rank: 2, teamId: "t2", points: 1799, change: -1 },
  { rank: 3, teamId: "t3", points: 1744, change: 0 },
];

export const api = {
  getTournaments: async () => {
    try {
      const res = await apiFetch("/api/tournaments");
      return await res.json();
    } catch {
      return mockTournaments;
    }
  },
  getTournament: async (id: string) => {
    try {
      const res = await apiFetch(`/api/tournaments/${id}`);
      return await res.json();
    } catch {
      return mockTournaments.find((t) => t.id === id);
    }
  },
  getLiveMatches: async () => mockMatches.filter((m) => m.status === "live"),
  getMatchesByTournament: async (id: string) =>
    mockMatches.filter((m) => m.tournamentId === id),
  getTeams: async () => {
    try {
      const res = await apiFetch("/api/teams");
      return await res.json();
    } catch {
      return mockTeams;
    }
  },
  getTeam: async (id: string) => {
    try {
      const res = await apiFetch(`/api/teams/${id}`);
      if (!res.ok) return undefined;
      const data = await res.json();
      return data.team;
    } catch {
      return mockTeams.find((t) => t.id === id);
    }
  },
  getUsers: async () => mockUsers,
  getUser: async (id: string) => {
    try {
      const res = await apiFetch(`/api/users/${id}`);
      if (!res.ok) return undefined;
      const data = await res.json();
      const user = data.user;
      return user
        ? {
            ...user,
            avatar: user.faceitAvatar || user.avatar,
            faceitLevel: user.faceitLevel,
            faceitElo: user.faceitElo,
          }
        : undefined;
    } catch {
      return mockUsers.find((u) => u.id === id);
    }
  },
  getLobbies: async () => {
    try {
      const res = await apiFetch("/api/lobbies");
      return await res.json();
    } catch {
      return mockLobbies;
    }
  },
  getLobby: async (id: string) => mockLobbies.find((l) => l.id === id),
  getRankings: async () => {
    try {
      const res = await apiFetch("/api/rankings/teams");
      const data = await res.json();
      return data.length > 0 ? data : mockRankings; // Fallback to mock if db is empty for UI purposes
    } catch {
      return mockRankings;
    }
  },
  syncMatchWithFaceit: async (matchId: string) => {
    // Calls our backend Express server that abstracts the FACEIT API
    try {
      const res = await apiFetch(`/api/faceit/match/${matchId}`);
      if (!res.ok) throw new Error("Backend failed to fetch from Faceit");
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  // Create a new lobby (requires authentication cookie)
  createLobby: async (payload: {
    tournamentId: string;
    name: string;
    description?: string;
    faceitUrl?: string;
  }) => {
    try {
      const res = await apiFetch("/api/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // If server requires FACEIT profile and caller provided a faceitUrl, retry once including faceitUrl
        if (
          err.error &&
          err.error.toString().toLowerCase().includes("faceit") &&
          payload.faceitUrl
        ) {
          try {
            const retryRes = await apiFetch("/api/lobbies", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(payload),
            });
            if (!retryRes.ok) {
              const rerr = await retryRes.json().catch(() => ({}));
              throw new Error(rerr.error || "Failed to create lobby (retry)");
            }
            const data2 = await retryRes.json();
            return data2;
          } catch (retryErr) {
            throw retryErr;
          }
        }
        throw apiError(err.error || "Failed to create lobby", res.status);
      }
      const data = await res.json();
      return data; // { id }
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Delete a lobby (captain or admin via email)
  deleteLobby: async (lobbyId: string) => {
    try {
      const res = await apiFetch(`/api/lobbies/${lobbyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete lobby");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Notifications
  getNotifications: async () => {
    try {
      const res = await apiFetch("/api/notifications", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // Link FACEIT profile for the current user
  linkFaceit: async (faceitUrl: string) => {
    try {
      const res = await apiFetch("/api/auth/faceit/link", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceitUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw apiError(
          err.error || "Failed to link FACEIT profile",
          res.status,
        );
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  markNotificationRead: async (id: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark notification read");
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  markAllNotificationsRead: async () => {
    try {
      const res = await apiFetch(`/api/notifications/mark-all-read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark notifications read");
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Join a lobby slot (requires authentication cookie) — internal/backwards-compatible
  joinLobby: async (lobbyId: string, slotId: string) => {
    try {
      const res = await apiFetch(`/api/lobbies/${lobbyId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slotId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to join slot");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Submit a join request (recommended flow) — creates a pending request for captain to accept/reject
  requestJoin: async (
    lobbyId: string,
    payload: { message?: string; slotId?: string },
  ) => {
    try {
      const res = await apiFetch(`/api/lobbies/${lobbyId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit request");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Get pending requests for a lobby (captain only)
  getLobbyRequests: async (lobbyId: string) => {
    try {
      const res = await apiFetch(`/api/lobbies/${lobbyId}/requests`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  acceptRequest: async (lobbyId: string, reqId: string) => {
    try {
      const res = await apiFetch(
        `/api/lobbies/${lobbyId}/requests/${reqId}/accept`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to accept request");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  rejectRequest: async (lobbyId: string, reqId: string) => {
    try {
      const res = await apiFetch(
        `/api/lobbies/${lobbyId}/requests/${reqId}/reject`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reject request");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  getChatMessages: async (lobbyId: string) => {
    try {
      const res = await apiFetch(`/api/lobbies/${lobbyId}/chat/messages`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  postChatMessage: async (lobbyId: string, content: string) => {
    try {
      const res = await apiFetch(`/api/lobbies/${lobbyId}/chat/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to post message");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
};

import { apiFetch } from "./http";

function apiError(message: string, status: number) {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

export const api = {
  getTournaments: async () => {
    try {
      const res = await apiFetch("/api/tournaments");
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },
  getTournament: async (id: string) => {
    try {
      const res = await apiFetch(`/api/tournaments/${id}`);
      return res.ok ? await res.json() : undefined;
    } catch {
      return undefined;
    }
  },
  getLiveMatches: async () => {
    try {
      const res = await apiFetch("/api/matches/live");
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },
  getMatchesByTournament: async (id: string) => {
    try {
      const res = await apiFetch(`/api/tournaments/${id}/matches`);
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },
  getTeams: async () => {
    try {
      const res = await apiFetch("/api/teams");
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },
  getTeam: async (id: string) => {
    try {
      const res = await apiFetch(`/api/teams/${id}`);
      if (!res.ok) return undefined;
      const data = await res.json();
      return data.team;
    } catch {
      return undefined;
    }
  },
  getUsers: async () => {
    try {
      const res = await apiFetch("/api/users");
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },
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
      return undefined;
    }
  },
  getLobbies: async () => {
    try {
      const res = await apiFetch("/api/lobbies");
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  },
  getLobby: async (id: string) => {
    try {
      const res = await apiFetch(`/api/lobbies/${id}`);
      return res.ok ? await res.json() : undefined;
    } catch {
      return undefined;
    }
  },
  getRankings: async () => {
    try {
      const res = await apiFetch("/api/rankings/teams");
      const data = await res.json();
      return data;
    } catch {
      return [];
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

  deleteTeam: async (teamId: string) => {
    const res = await apiFetch(`/api/teams/${teamId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw apiError(err.error || "Failed to delete team", res.status);
    }
    return await res.json();
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

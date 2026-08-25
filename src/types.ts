export type Language = "fi" | "en";

export interface User {
  id: string;
  username: string;
  avatar?: string;
  country: string; // 'FI', etc.
  faceitLevel?: number;
  faceitElo?: number;
  faceitAvatar?: string;
  faceitUsername?: string;
  role?: "AWPer" | "Rifler" | "Entry" | "Support" | "IGL";
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  country: string;
  captainId: string;
  playerIds: string[];
  rankingPoints: number;
  wins: number;
  losses: number;
  prizeWinnings: number;
}

export interface Tournament {
  id: string;
  name: string;
  logo?: string;
  status: "upcoming" | "registration" | "live" | "completed";
  date: string;
  prizePool: number;
  teamCapacity: number;
  registeredTeamsCount: number;
  entryFee: number;
  format: string; // e.g., 'Single Elimination'
  registrationDeadline: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: string; // e.g., 'Puolivälierä'
  team1Id: string;
  team2Id: string;
  team1Score: number;
  team2Score: number;
  map: string;
  status: "upcoming" | "live" | "completed";
  scheduledTime: string;
  streamUrl?: string;
  faceitMatchId?: string; // Links to the FACEIT platform
}

export interface TeamLobbySlot {
  id: string;
  playerId?: string;
  requestedRole?: string;
  minFaceitLevel?: number;
  status: "empty" | "pending" | "occupied";
}

export interface TeamLobby {
  id: string;
  tournamentId: string;
  name: string;
  logo?: string;
  captainId: string;
  slots: TeamLobbySlot[];
  // Optional authoritative members returned by the backend (LobbyMember records).
  // Each member should include userId, user (optional), faceitProfile (optional), slotIndex, role, status, etc.
  members?: any[];
  status: "forming" | "ready" | "registered";
  description?: string;
}

export interface RankingEntry {
  rank: number;
  teamId: string;
  points: number;
  change: number; // positive for up, negative for down, 0 for no change
}

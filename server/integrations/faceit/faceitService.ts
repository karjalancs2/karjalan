import { prisma } from "../../database/prisma";
import { rankingService } from "../../services/rankingService";

type FaceitError = Error & {
  status?: number;
  rawResponse?: string;
};

function logFaceitError(context: string, error: unknown) {
  const faceitError = error as FaceitError;
  console.error(`${context}: ${faceitError.message || String(error)}`);
  if (faceitError.stack) console.error(faceitError.stack);
  if (faceitError.rawResponse) {
    console.error(`FACEIT raw response: ${faceitError.rawResponse}`);
  }
}

function extractItems(payload: any, collectionNames: string[] = []): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  for (const collectionName of collectionNames) {
    if (Array.isArray(payload?.[collectionName]))
      return payload[collectionName];
    if (Array.isArray(payload?.data?.[collectionName])) {
      return payload.data[collectionName];
    }
  }
  return [];
}

function appendPagination(suffix: string) {
  if (!suffix) return "?offset=0&limit=100";
  return suffix.includes("?")
    ? `${suffix}${suffix.endsWith("?") ? "" : "&"}offset=0&limit=100`
    : `${suffix}?offset=0&limit=100`;
}

function getFactionName(faction: any): string {
  const name = typeof faction?.nickname === "string"
    ? faction.nickname.trim()
    : typeof faction?.name === "string"
      ? faction.name.trim()
      : "";
  return name || "TBD";
}

function getMatchRound(match: any): number {
  const rawRound = match?.round ?? match?.round_number ?? match?.stage?.round;
  if (typeof rawRound === "number" && Number.isFinite(rawRound)) {
    return Math.trunc(rawRound);
  }
  if (typeof rawRound === "string") {
    const parsed = Number(rawRound.replace(/[^0-9.-]+/g, ""));
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return 0;
}

function getTeamIds(match: any): string[] {
  const teams = match?.teams || match?.factions || {};
  const entries = Array.isArray(teams) ? teams : Object.values(teams);
  return entries
    .map(
      (team: any) =>
        team?.team_id || team?.id || team?.team?.id || team?.faction_id,
    )
    .filter((teamId): teamId is string => typeof teamId === "string");
}

function getScore(match: any, teamId: string | undefined): number {
  if (!teamId) return 0;
  const results = match?.results;
  const result = Array.isArray(results)
    ? results.find((entry: any) => entry?.team_id === teamId)
    : results?.[teamId];
  const score = Number(
    result?.score?.faction1 ??
      result?.score?.faction2 ??
      result?.score ??
      result ??
      0,
  );
  return Number.isFinite(score) ? Math.trunc(score) : 0;
}

export function normalizeFaceitMatch(match: any): any | null {
  const faceitId = match?.match_id || match?.id;
  if (typeof faceitId !== "string" || !faceitId) return null;

  const rawTeams = match?.teams || match?.factions || {};
  const faction1 =
    rawTeams?.faction1 || (Array.isArray(rawTeams) ? rawTeams[0] : null);
  const faction2 =
    rawTeams?.faction2 || (Array.isArray(rawTeams) ? rawTeams[1] : null);
  const team1Name = getFactionName(faction1);
  const team2Name = getFactionName(faction2);
  const team1Id =
    faction1?.team_id ||
    faction1?.id ||
    faction1?.team?.id ||
    faction1?.faction_id ||
    team1Name;
  const team2Id =
    faction2?.team_id ||
    faction2?.id ||
    faction2?.team?.id ||
    faction2?.faction_id ||
    team2Name;

  const rawScore = match?.results?.score || match?.results?.[0]?.score || {};
  const team1Score = Number(rawScore?.faction1 ?? rawScore?.team1 ?? 0);
  const team2Score = Number(rawScore?.faction2 ?? rawScore?.team2 ?? 0);
  const roundNumber = getMatchRound(match);
  const scheduledAt =
    match?.scheduled_at != null ? Number(match.scheduled_at) : null;
  const parsedScheduledTime =
    scheduledAt != null
      ? new Date(
          scheduledAt > 1_000_000_000_000 ? scheduledAt : scheduledAt * 1000,
        )
      : null;
  const stage =
    match?.stage_name ||
    match?.stage ||
    match?.group_name ||
    match?.round_name ||
    (match?.round != null ? `Round ${match.round}` : "Unassigned");

  return {
    faceitId,
    team1Id: team1Name,
    team2Id: team2Name,
    team1Name,
    team2Name,
    team1Score: Number.isFinite(team1Score) ? Math.trunc(team1Score) : 0,
    team2Score: Number.isFinite(team2Score) ? Math.trunc(team2Score) : 0,
    round: roundNumber,
    roundLabel: typeof stage === "string" ? stage : "Unassigned",
    status: typeof match?.status === "string" ? match.status : "upcoming",
    scheduledTime:
      parsedScheduledTime && !Number.isNaN(parsedScheduledTime.getTime())
        ? parsedScheduledTime
        : null,
  };
}

function groupMatchesByStage(matches: any[], stages: any[]): any[] {
  const groups = new Map<string, any>();
  const stageNames = new Map<string, string>();
  for (const stage of stages) {
    const id = String(stage?.id || stage?.stage_id || stage?.name || "stage");
    const name =
      stage?.name ||
      stage?.stage_name ||
      stage?.type ||
      `Stage ${groups.size + 1}`;
    stageNames.set(id, name);
    groups.set(id, { id, name, round: name, matches: [] });
  }

  for (const match of matches) {
    const stageId = match?.stage_id || match?.stage?.id;
    const roundNumber = Number(match?.round ?? 0);
    const name =
      (stageId && stageNames.get(String(stageId))) ||
      (Number.isFinite(roundNumber) && roundNumber > 0
        ? `Round ${roundNumber}`
        : match.roundLabel || "Unassigned");
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "unassigned";
    const group = groups.get(id) || {
      id,
      name,
      round: name,
      matches: [],
    };
    group.matches.push({
      id: match.faceitId,
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      team1Name: match.team1Name,
      team2Name: match.team2Name,
      round: roundNumber || 0,
      team1Score: match.team1Score,
      team2Score: match.team2Score,
    });
    groups.set(id, group);
  }

  return Array.from(groups.values())
    .filter((group) => group.matches.length > 0)
    .sort((a, b) => {
      const aValue = Number(a.matches?.[0]?.round ?? 0);
      const bValue = Number(b.matches?.[0]?.round ?? 0);
      return aValue - bValue;
    });
}

/**
 * FACEIT Service Abstraction
 * Handles both MOCK and PRODUCTION modes.
 */
export class FaceitService {
  private isMockMode: boolean;
  private apiKey: string | undefined;

  constructor() {
    // Determine mock mode from environment
    this.isMockMode =
      process.env.FACEIT_MOCK_MODE === "true" || !process.env.FACEIT_API_KEY;
    this.apiKey = process.env.FACEIT_API_KEY;
  }

  private getApiKey() {
    if (!this.apiKey) throw new Error("FACEIT_API_KEY is not configured");
    return this.apiKey;
  }

  private async fetchTournamentResource(
    resource: "tournaments" | "championships",
    faceitId: string,
    suffix = "",
  ) {
    const response = await fetch(
      `https://open.faceit.com/data/v4/${resource}/${encodeURIComponent(faceitId)}${suffix}`,
      { headers: { Authorization: `Bearer ${this.getApiKey()}` } },
    );
    const rawResponse = await response.text();
    if (!response.ok) {
      const error = new Error(
        `FACEIT API returned ${response.status}`,
      ) as FaceitError;
      error.status = response.status;
      error.rawResponse = rawResponse;
      throw error;
    }

    try {
      return JSON.parse(rawResponse);
    } catch (error) {
      const parseError = new Error(
        `FACEIT API returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      ) as FaceitError;
      parseError.rawResponse = rawResponse;
      throw parseError;
    }
  }

  private extractTournamentReference(input: string): {
    id: string;
    resource: "tournaments" | "championships";
    hasResourceHint: boolean;
  } {
    const value = input.trim();
    const match = value.match(
      /(?:^|\/)(?:tournament|championship)\/([a-zA-Z0-9-]+)(?:[/?#]|$)/i,
    );
    const id = match?.[1] || value;
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
      throw new Error("Invalid FACEIT tournament ID or URL");
    }

    const resource = /\/championship\//i.test(value)
      ? "championships"
      : "tournaments";
    return { id, resource, hasResourceHint: Boolean(match) };
  }

  async importTournament(input: string) {
    const reference = this.extractTournamentReference(input);
    const faceitId = reference.id;
    let resource = reference.resource;
    let details: any;

    try {
      details = await this.fetchTournamentResource(resource, faceitId);
    } catch (error: any) {
      if (error.status !== 404) {
        logFaceitError("FACEIT tournament fetch failed", error);
        throw error;
      }
      if (reference.hasResourceHint) {
        const notFoundError = new Error(
          "Tournament not found. Please ensure it is a valid FACEIT Tournament ID.",
        ) as FaceitError;
        notFoundError.status = 404;
        notFoundError.rawResponse = error.rawResponse;
        logFaceitError("FACEIT tournament was not found", notFoundError);
        throw notFoundError;
      }
      resource = "championships";
      try {
        details = await this.fetchTournamentResource("championships", faceitId);
      } catch (championshipError: any) {
        if (championshipError.status === 404) {
          const notFoundError = new Error(
            "Tournament not found. Please ensure it is a valid FACEIT Tournament ID.",
          ) as FaceitError;
          notFoundError.status = 404;
          notFoundError.rawResponse = championshipError.rawResponse;
          logFaceitError("FACEIT tournament was not found", notFoundError);
          throw notFoundError;
        }
        logFaceitError("FACEIT championship fetch failed", championshipError);
        throw championshipError;
      }
    }

    let rawMatches: any = [];
    let stages: any[] = [];
    let rawSubscriptions: any[] = [];
    try {
      const matchesResource =
        resource === "championships" ? "championships" : "tournaments";
      rawMatches = await this.fetchTournamentResource(
        matchesResource,
        faceitId,
        appendPagination("/matches"),
      );
    } catch (error) {
      const faceitError = error as FaceitError;
      console.warn(
        `FACEIT matches unavailable for ${resource}/${faceitId}: ${faceitError.message || String(error)}. Continuing without matches.`,
      );
    }

    if (resource === "championships") {
      try {
        const rawStages = await this.fetchTournamentResource(
          resource,
          faceitId,
          "/stages",
        );
        stages = extractItems(rawStages, ["stages"]);
      } catch (error) {
        const faceitError = error as FaceitError;
        console.warn(
          `FACEIT stages unavailable for championships/${faceitId}: ${faceitError.message || String(error)}. Grouping matches by round instead.`,
        );
      }

      try {
        const subscriptions = await this.fetchTournamentResource(
          resource,
          faceitId,
          appendPagination("/subscriptions"),
        );
        rawSubscriptions = extractItems(subscriptions, ["subscriptions"]);
      } catch (error) {
        const faceitError = error as FaceitError;
        console.warn(
          `FACEIT subscriptions unavailable for championships/${faceitId}: ${faceitError.message || String(error)}. Continuing without participant data.`,
        );
      }
    } else {
      try {
        const rawBrackets = await this.fetchTournamentResource(
          resource,
          faceitId,
          "/brackets",
        );
        stages = extractItems(rawBrackets);
      } catch (error) {
        const faceitError = error as FaceitError;
        console.warn(
          `FACEIT brackets unavailable for tournaments/${faceitId}: ${faceitError.message || String(error)}. Grouping matches by round instead.`,
        );
      }
    }

    const response =
      rawMatches && typeof rawMatches === "object" && !Array.isArray(rawMatches)
        ? rawMatches
        : { data: { items: Array.isArray(rawMatches) ? rawMatches : [] } };
    const safeMatches = response?.data?.items || response?.items || [];
    const matches = Array.isArray(safeMatches)
      ? safeMatches
          .map(normalizeFaceitMatch)
          .filter((match): match is any => match !== null)
      : [];
    const computedBrackets = groupMatchesByStage(matches, stages);
    const brackets = Array.isArray(computedBrackets) ? computedBrackets : [];

    try {
      const tournament = await prisma.$transaction(async (tx) => {
        await tx.tournament.updateMany({ data: { isActive: false } });

        const existing = await tx.tournament.findFirst({ where: { faceitId } });
        const parsedDate = details?.start_date
          ? new Date(details.start_date)
          : null;
        const prizePool = Number(details?.prize_pool);
        const teamCapacity = Number(
          details?.max_participants ??
            details?.max_teams ??
            (rawSubscriptions.length > 0 ? rawSubscriptions.length : 64),
        );
        const data = {
          name:
            typeof details?.name === "string" && details.name.trim()
              ? details.name.trim()
              : `FACEIT Tournament ${faceitId}`,
          status:
            typeof details?.status === "string" && details.status.trim()
              ? details.status
              : "upcoming",
          date:
            parsedDate && !Number.isNaN(parsedDate.getTime())
              ? parsedDate
              : null,
          prizePool: Number.isFinite(prizePool)
            ? Math.max(0, Math.trunc(prizePool))
            : 0,
          teamCapacity: Number.isFinite(teamCapacity)
            ? Math.max(1, Math.trunc(teamCapacity))
            : 64,
          format:
            typeof details?.format === "string" && details.format.trim()
              ? details.format
              : "FACEIT",
          faceitId,
          isActive: true,
          bracketData: brackets,
        };

        const saved = existing
          ? await tx.tournament.update({ where: { id: existing.id }, data })
          : await tx.tournament.create({ data });

        await tx.match.deleteMany({ where: { tournamentId: saved.id } });
        for (const match of matches) {
          const safeRound = Number.isFinite(Number(match.round))
            ? Number(match.round)
            : 0;
          await tx.match.upsert({
            where: { faceitId: match.faceitId },
            update: {
              tournamentId: saved.id,
              faceitId: match.faceitId,
              team1Id: match.team1Id,
              team2Id: match.team2Id,
              team1Score: match.team1Score,
              team2Score: match.team2Score,
              round: safeRound,
              status: match.status,
              scheduledTime: match.scheduledTime,
            },
            create: {
              tournamentId: saved.id,
              faceitId: match.faceitId,
              team1Id: match.team1Id,
              team2Id: match.team2Id,
              team1Score: match.team1Score,
              team2Score: match.team2Score,
              round: safeRound,
              status: match.status,
              scheduledTime: match.scheduledTime,
            },
          });
        }
        return saved;
      });

      return {
        tournament,
        brackets,
        matches,
      };
    } catch (error) {
      logFaceitError("FACEIT tournament database import failed", error);
      throw error;
    }
  }

  /**
   * Called when an Admin connects a FACEIT tournament via URL.
   */
  async connectTournament(localTournamentId: string, faceitUrl: string) {
    // Extract tournament ID or Championship ID from URL
    const faceitIdMatch =
      faceitUrl.match(/championship\/([a-zA-Z0-9-]+)/) ||
      faceitUrl.match(/tournament\/([a-zA-Z0-9-]+)/);
    const faceitId = faceitIdMatch ? faceitIdMatch[1] : "mock-faceit-id-12345";

    if (this.isMockMode) {
      console.log(
        `[FACEIT MOCK] Connecting tournament ${localTournamentId} to Faceit ID ${faceitId}`,
      );
      await prisma.tournament.update({
        where: { id: localTournamentId },
        data: { faceitId },
      });
      return {
        success: true,
        faceitId,
        mode: "MOCK",
        name: "Mock Faceit Championship",
      };
    }

    try {
      // PRODUCTION MODE
      const res = await fetch(
        `https://open.faceit.com/data/v4/championships/${faceitId}`,
        {
          headers: { Authorization: "Bearer " + (this.apiKey || "") },
        },
      );

      if (!res.ok) throw new Error("Failed to fetch from FACEIT API");
      const data = await res.json();

      await prisma.tournament.update({
        where: { id: localTournamentId },
        data: { faceitId },
      });

      return { success: true, faceitId, mode: "PRODUCTION", name: data.name };
    } catch (error: any) {
      console.error("[FACEIT PROD] Error connecting:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Processes incoming webhooks from FACEIT
   */
  async processWebhook(payload: any) {
    // 1. Authenticate webhook (verify signatures if required in prod)
    // 2. Identify event type
    const event = payload.event;

    console.log(`[FACEIT WEBHOOK] Received event: ${event}`);

    if (event === "match_status_finished") {
      const matchData = payload.payload;
      const faceitMatchId = matchData.id;

      try {
        // Extract scores from webhook payload (depending on FACEIT exact structure)
        // Usually nested in results array
        const team1Score = matchData.results?.[0]?.score?.faction1 || 0;
        const team2Score = matchData.results?.[0]?.score?.faction2 || 0;

        // Update match in our DB
        const match = await prisma.match.update({
          where: { faceitId: faceitMatchId },
          data: {
            status: "completed",
            team1Score: team1Score,
            team2Score: team2Score,
          },
        });

        // Automatically trigger ranking point calculation!
        await rankingService.processMatchResult(
          match.id,
          team1Score,
          team2Score,
        );
      } catch (err) {
        console.error("Failed to process match finish webhook:", err);
      }
    }

    return { success: true };
  }

  /**
   * Fetch a FACEIT player profile by username or profile URL. Returns normalized profile data.
   */
  async getPlayerProfile(identifier: string) {
    // Accept either full URL or username; extract username if URL provided
    const urlMatch = identifier.match(
      /faceit\.com\/(?:\w{2}\/)?players\/(.+)$/i,
    );
    const nickname = urlMatch ? decodeURIComponent(urlMatch[1]) : identifier;

    if (this.isMockMode) {
      // Return a mock profile in dev mode
      return {
        success: true,
        mode: "MOCK",
        playerId: `mock-${nickname}`,
        nickname,
        avatar: null,
        elo: 1200,
        level: 5,
        profileUrl: `https://www.faceit.com/en/players/${nickname}`,
      };
    }

    try {
      // Use the FACEIT players endpoint. The API supports fetching by nickname.
      const res = await fetch(
        `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`,
        {
          headers: { Authorization: "Bearer " + (this.apiKey || "") },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch FACEIT player");
      const data = await res.json();

      return {
        success: true,
        mode: "PRODUCTION",
        playerId: data.player_id || data.playerId || data.guid || null,
        nickname: data.nickname || data.player_name || nickname,
        avatar: data.avatar || data.faceit_avatars?.[0] || null,
        elo:
          data.games?.cs2?.faceit_elo ||
          data.games?.csgo?.faceit_elo ||
          data.elo ||
          null,
        level:
          data.games?.cs2?.skill_level ||
          data.games?.csgo?.skill_level ||
          data.skill_level ||
          null,
        profileUrl:
          data.profile_url || `https://www.faceit.com/en/players/${nickname}`,
      };
    } catch (error: any) {
      console.error("[FACEIT PROD] Error fetching player profile:", error);
      throw new Error("FACEIT profile could not be verified");
    }
  }
}

export const faceitService = new FaceitService();

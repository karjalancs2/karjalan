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

    let brackets: any;
    let matches: any;
    try {
      [brackets, matches] = await Promise.all([
        this.fetchTournamentResource(resource, faceitId, "/brackets"),
        this.fetchTournamentResource(resource, faceitId, "/matches"),
      ]);
    } catch (error) {
      logFaceitError("FACEIT bracket or match fetch failed", error);
      throw error;
    }

    try {
      const tournament = await prisma.$transaction(async (tx) => {
        await tx.tournament.updateMany({ data: { isActive: false } });

        const existing = await tx.tournament.findFirst({ where: { faceitId } });
        const parsedDate = details?.start_date
          ? new Date(details.start_date)
          : null;
        const prizePool = Number(details?.prize_pool);
        const teamCapacity = Number(
          details?.max_participants ?? details?.max_teams,
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
          bracketData: brackets ?? null,
        };

        const saved = existing
          ? await tx.tournament.update({ where: { id: existing.id }, data })
          : await tx.tournament.create({ data });

        const records = Array.isArray(matches)
          ? matches
          : Array.isArray(matches?.items)
            ? matches.items
            : [];
        for (const match of records) {
          const matchId = match?.match_id || match?.id;
          if (typeof matchId !== "string" || !matchId) continue;
          const factions = match.teams || match.factions || {};
          const teamIds = Object.values(factions)
            .map((team: any) => team?.team_id || team?.id)
            .filter((teamId): teamId is string => typeof teamId === "string");
          const team1Score = Number(match.results?.[teamIds[0]]);
          const team2Score = Number(match.results?.[teamIds[1]]);
          const scheduledTime = match.scheduled_at
            ? new Date(match.scheduled_at)
            : null;
          const matchData = {
            tournamentId: saved.id,
            faceitId: matchId,
            team1Id: teamIds[0] || null,
            team2Id: teamIds[1] || null,
            team1Score: Number.isFinite(team1Score)
              ? Math.trunc(team1Score)
              : 0,
            team2Score: Number.isFinite(team2Score)
              ? Math.trunc(team2Score)
              : 0,
            round: typeof match.round === "string" ? match.round : null,
            status:
              typeof match.status === "string" ? match.status : "upcoming",
            scheduledTime:
              scheduledTime && !Number.isNaN(scheduledTime.getTime())
                ? scheduledTime
                : null,
          };
          await tx.match.upsert({
            where: { faceitId: matchId },
            create: matchData,
            update: matchData,
          });
        }
        return saved;
      });

      return {
        tournament,
        brackets,
        matches: Array.isArray(matches)
          ? matches
          : Array.isArray(matches?.items)
            ? matches.items
            : [],
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

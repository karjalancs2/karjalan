import { prisma } from "../../database/prisma";
import { rankingService } from "../../services/rankingService";

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
    if (!response.ok) {
      throw new Error(`FACEIT API returned ${response.status}`);
    }
    return response.json();
  }

  private extractTournamentId(input: string) {
    const value = input.trim();
    const match = value.match(
      /(?:tournament|championship)\/([a-zA-Z0-9-]+)/i,
    );
    const id = match?.[1] || value;
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
      throw new Error("Invalid FACEIT tournament ID or URL");
    }
    return id;
  }

  async importTournament(input: string) {
    const faceitId = this.extractTournamentId(input);
    let resource: "tournaments" | "championships" = "tournaments";
    let details: any;

    try {
      details = await this.fetchTournamentResource("tournaments", faceitId);
    } catch {
      resource = "championships";
      details = await this.fetchTournamentResource("championships", faceitId);
    }

    const [brackets, matches] = await Promise.all([
      this.fetchTournamentResource(resource, faceitId, "/brackets"),
      this.fetchTournamentResource(resource, faceitId, "/matches"),
    ]);

    const tournament = await prisma.$transaction(async (tx) => {
      await tx.tournament.updateMany({ data: { isActive: false } });

      const existing = await tx.tournament.findFirst({ where: { faceitId } });
      const data = {
        name: details.name || `FACEIT Tournament ${faceitId}`,
        status: details.status || "upcoming",
        date: details.start_date ? new Date(details.start_date) : null,
        prizePool: Number(details.prize_pool || 0),
        teamCapacity: Number(details.max_participants || details.max_teams || 64),
        format: details.format || "FACEIT",
        faceitId,
        isActive: true,
        bracketData: brackets,
      };

      const saved = existing
        ? await tx.tournament.update({ where: { id: existing.id }, data })
        : await tx.tournament.create({ data });

      const records = Array.isArray(matches) ? matches : matches.items || [];
      for (const match of records) {
        const matchId = match.match_id || match.id;
        if (!matchId) continue;
        const factions = match.teams || match.factions || {};
        const teamIds = Object.values(factions)
          .map((team: any) => team?.team_id || team?.id)
          .filter(Boolean) as string[];
        await tx.match.upsert({
          where: { faceitId: matchId },
          create: {
            tournamentId: saved.id,
            faceitId: matchId,
            team1Id: teamIds[0] || null,
            team2Id: teamIds[1] || null,
            team1Score: Number(match.results?.[teamIds[0]] || 0),
            team2Score: Number(match.results?.[teamIds[1]] || 0),
            round: match.round || null,
            status: match.status || "upcoming",
            scheduledTime: match.scheduled_at
              ? new Date(match.scheduled_at)
              : null,
          },
          update: {
            tournamentId: saved.id,
            team1Id: teamIds[0] || null,
            team2Id: teamIds[1] || null,
            round: match.round || null,
            status: match.status || "upcoming",
            scheduledTime: match.scheduled_at
              ? new Date(match.scheduled_at)
              : null,
          },
        });
      }
      return saved;
    });

    return { tournament, brackets, matches: Array.isArray(matches) ? matches : matches.items || [] };
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

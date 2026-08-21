import { prisma } from '../../database/prisma';
import { rankingService } from '../../services/rankingService';

/**
 * FACEIT Service Abstraction
 * Handles both MOCK and PRODUCTION modes.
 */
export class FaceitService {
  private isMockMode: boolean;
  private apiKey: string | undefined;

  constructor() {
    // Determine mock mode from environment
    this.isMockMode = process.env.FACEIT_MOCK_MODE === 'true' || !process.env.FACEIT_API_KEY;
    this.apiKey = process.env.FACEIT_API_KEY;
  }

  /**
   * Called when an Admin connects a FACEIT tournament via URL.
   */
  async connectTournament(localTournamentId: string, faceitUrl: string) {
    // Extract tournament ID or Championship ID from URL
    const faceitIdMatch = faceitUrl.match(/championship\/([a-zA-Z0-9-]+)/) || faceitUrl.match(/tournament\/([a-zA-Z0-9-]+)/);
    const faceitId = faceitIdMatch ? faceitIdMatch[1] : 'mock-faceit-id-12345';

    if (this.isMockMode) {
      console.log(`[FACEIT MOCK] Connecting tournament ${localTournamentId} to Faceit ID ${faceitId}`);
      await prisma.tournament.update({
        where: { id: localTournamentId },
        data: { faceitId }
      });
      return { success: true, faceitId, mode: 'MOCK', name: 'Mock Faceit Championship' };
    }

    try {
      // PRODUCTION MODE
      const res = await fetch(`https://open.faceit.com/data/v4/championships/${faceitId}`, {
        headers: { 'Authorization': 'Bearer ' + (this.apiKey || '') }
      });
      
      if (!res.ok) throw new Error('Failed to fetch from FACEIT API');
      const data = await res.json();
      
      await prisma.tournament.update({
        where: { id: localTournamentId },
        data: { faceitId }
      });

      return { success: true, faceitId, mode: 'PRODUCTION', name: data.name };
    } catch (error: any) {
      console.error('[FACEIT PROD] Error connecting:', error);
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

    if (event === 'match_status_finished') {
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
            status: 'completed',
            team1Score: team1Score,
            team2Score: team2Score
          }
        });

        // Automatically trigger ranking point calculation!
        await rankingService.processMatchResult(match.id, team1Score, team2Score);

      } catch (err) {
        console.error('Failed to process match finish webhook:', err);
      }
    }
    
    return { success: true };
  }

  /**
   * Fetch a FACEIT player profile by username or profile URL. Returns normalized profile data.
   */
  async getPlayerProfile(identifier: string) {
    // Accept either full URL or username; extract username if URL provided
    const urlMatch = identifier.match(/faceit\.com\/(?:\w{2}\/)?players\/(.+)$/i);
    const nickname = urlMatch ? decodeURIComponent(urlMatch[1]) : identifier;

    if (this.isMockMode) {
      // Return a mock profile in dev mode
      return {
        success: true,
        mode: 'MOCK',
        playerId: `mock-${nickname}`,
        nickname,
        avatar: null,
        elo: 1200,
        level: 5,
        profileUrl: `https://www.faceit.com/en/players/${nickname}`
      };
    }

    try {
      // Use the FACEIT players endpoint. The API supports fetching by nickname.
      const res = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`, {
        headers: { 'Authorization': 'Bearer ' + (this.apiKey || '') }
      });
      if (!res.ok) throw new Error('Failed to fetch FACEIT player');
      const data = await res.json();

      return {
        success: true,
        mode: 'PRODUCTION',
        playerId: data.player_id || data.playerId || data.guid || null,
        nickname: data.nickname || data.player_name || nickname,
        avatar: data.avatar || data.faceit_avatars?.[0] || null,
        elo: data.games?.cs2?.faceit_elo || data.elo || null,
        level: data.games?.cs2?.faceit_level || data.faceit_elo || null,
        profileUrl: data.profile_url || `https://www.faceit.com/en/players/${nickname}`
      };
    } catch (error: any) {
      console.error('[FACEIT PROD] Error fetching player profile:', error);
      throw new Error('FACEIT profile could not be verified');
    }
  }
}

export const faceitService = new FaceitService();

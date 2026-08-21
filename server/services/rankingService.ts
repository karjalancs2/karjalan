import { prisma } from '../database/prisma';

export const rankingService = {
  /**
   * Recalculates team points after a match finishes.
   * This is a simple implementation that can be expanded with Elo or tournament-tier multipliers later.
   */
  async processMatchResult(matchId: string, team1Score: number, team2Score: number) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: true }
    });

    if (!match || !match.team1Id || !match.team2Id) return;

    // Determine winner and loser
    const team1Won = team1Score > team2Score;
    const winnerId = team1Won ? match.team1Id : match.team2Id;
    const loserId = team1Won ? match.team2Id : match.team1Id;

    // Simple calculation: +25 for win, -10 for loss
    // In the future, you can multiply this by tournament.tier or opponent's rank.
    await prisma.team.update({
      where: { id: winnerId },
      data: { rankingPoints: { increment: 25 } }
    });

    const losingTeam = await prisma.team.findUnique({
      where: { id: loserId },
      select: { rankingPoints: true }
    });

    if (losingTeam) {
      const newPoints = Math.max(0, losingTeam.rankingPoints - 10);
      await prisma.team.update({
        where: { id: loserId },
        data: { rankingPoints: newPoints }
      });
    }

    console.log(`[RANKING ENGINE] Updated points: Team ${winnerId} (+25), Team ${loserId} (new points: ${losingTeam ? Math.max(0, losingTeam.rankingPoints - 10) : 0})`);
  }
};

type DiscordEmbed = {
  title: string;
  url?: string;
  description?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
  footer?: { text: string };
};

type TournamentAnnouncement = {
  id: string;
  name: string;
  status: string;
  date: Date | null;
  prizePool: number;
};

type TournamentResults = {
  tournament: TournamentAnnouncement;
  teams: Array<{
    name: string;
    wins: number;
    losses: number;
    rankingPoints: number;
  }>;
  players: Array<{
    nickname: string;
    teamName: string;
    kills: number;
    deaths: number;
    assists: number;
  }>;
};

async function postTournamentEmbed(
  webhookUrl: string,
  embed: DiscordEmbed,
  threadName?: string,
) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      ...(threadName ? { thread_name: threadName } : {}),
      embeds: [embed],
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook returned ${response.status}`);
  }
}

async function sendTournamentEmbed(embed: DiscordEmbed) {
  const channelWebhookUrl = process.env.DISCORD_TOURNAMENT_WEBHOOK_URL;
  const forumWebhookUrl =
    process.env.DISCORD_TOURNAMENT_ANNOUNCEMENT_WEBHOOK_URL;
  const legacyWebhookUrl = process.env.DISCORD_ANNOUNCEMENTS_WEBHOOK_URL;
  const standardWebhookUrl = channelWebhookUrl || legacyWebhookUrl;

  if (!standardWebhookUrl && !forumWebhookUrl) {
    console.warn(
      "Discord tournament notification skipped: DISCORD_TOURNAMENT_WEBHOOK_URL is not configured",
    );
    return;
  }

  const deliveries: Array<{ name: string; promise: Promise<void> }> = [];
  if (standardWebhookUrl) {
    deliveries.push({
      name: "standard channel",
      promise: postTournamentEmbed(standardWebhookUrl, embed),
    });
  }
  if (forumWebhookUrl) {
    deliveries.push({
      name: "forum channel",
      promise: postTournamentEmbed(
        forumWebhookUrl,
        embed,
        embed.title,
      ),
    });
  }

  const results = await Promise.allSettled(
    deliveries.map(({ promise }) => promise),
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Failed to send tournament announcement to Discord ${deliveries[index].name}:`,
        result.reason,
      );
    }
  });

  if (!channelWebhookUrl && legacyWebhookUrl) {
    console.warn(
      "Using deprecated DISCORD_ANNOUNCEMENTS_WEBHOOK_URL for the standard channel",
    );
  }
}

export async function announceTournamentCreated(
  tournament: TournamentAnnouncement,
) {
  const startDate =
    tournament.date && !Number.isNaN(tournament.date.getTime())
      ? `<t:${Math.floor(tournament.date.getTime() / 1000)}:F>`
      : "To be announced";

  await sendTournamentEmbed({
    title: tournament.name,
    url: `https://karjalan.net/tournaments/${encodeURIComponent(tournament.id)}`,
    description: "Registration and tournament details are available on Karjalan.",
    color: 0xf0a500,
    fields: [
      { name: "Status", value: tournament.status || "Unknown", inline: true },
      {
        name: "Prize pool",
        value: `€${tournament.prizePool.toLocaleString("en-US")}`,
        inline: true,
      },
      {
        name: "Starts",
        value: startDate,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "Karjalan Tournaments" },
  });
}

export async function announceTournamentFinished({
  tournament,
  teams,
  players,
}: TournamentResults) {
  const teamSummary = teams.length
    ? teams
        .slice(0, 8)
        .map(
          (team, index) =>
            `**${index + 1}. ${team.name.slice(0, 60)}** — ${team.wins}W-${team.losses}L · ${team.rankingPoints} pts`,
        )
        .join("\n")
    : "No team results available.";
  const playerSummary = players.length
    ? players
        .slice(0, 8)
        .map(
          (player) =>
            `**${player.nickname.slice(0, 40)}** (${player.teamName.slice(0, 40)}) — ${player.kills} K / ${player.deaths} D / ${player.assists} A`,
        )
        .join("\n")
    : "No player stats available.";

  await sendTournamentEmbed({
    title: `Tournament finished: ${tournament.name}`,
    url: `https://karjalan.net/tournaments/${encodeURIComponent(tournament.id)}`,
    description: "Final team standings and player stats.",
    color: 0x38a169,
    fields: [
      { name: "Team results", value: teamSummary },
      { name: "Player stats", value: playerSummary },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "Karjalan Tournaments" },
  });
}

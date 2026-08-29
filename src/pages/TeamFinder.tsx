import { useEffect, useState } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { api } from "../lib/api";
import { TeamLobby, User, Tournament } from "../types";
import { Users, Filter, Plus, Shield, Crosshair } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { faceitTierClass, safeString } from "../lib/utils";

export default function TeamFinder() {
  const { t, language } = useTranslation();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState<TeamLobby[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<"profile" | "form">("form");
  const [faceitUrlInput, setFaceitUrlInput] = useState("");
  const [faceitVerifying, setFaceitVerifying] = useState(false);

  const [formName, setFormName] = useState("");
  const [formTournament, setFormTournament] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const unauthorizedMessage =
    language === "fi"
      ? "Kirjaudu sisään luodaksesi joukkueen"
      : "Please log in to create a team";
  const getActionError = (error: any, fallback: string) =>
    error?.status === 401 || error?.message === "Unauthorized"
      ? unauthorizedMessage
      : error?.message || fallback;

  const [requests, setRequests] = useState<any[]>([]);
  const [showRequestsFor, setShowRequestsFor] = useState<string | null>(null);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [showChatFor, setShowChatFor] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const tournamentList = Array.isArray(tournaments) ? tournaments : [];
  const lobbyList = Array.isArray(lobbies) ? lobbies : [];

  useEffect(() => {
    async function loadData() {
      setLobbies(await api.getLobbies());
      setUsers(await api.getUsers());
      setTournaments(await api.getTournaments());
    }
    loadData();
  }, []);

  const createLobby = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!formName || !formTournament) {
      alert(
        language === "fi"
          ? "Täytä joukkueen nimi ja turnaus"
          : "Please enter team name and tournament",
      );
      return;
    }

    setCreating(true);
    try {
      // Try to create lobby normally
      await api.createLobby({
        tournamentId: formTournament,
        name: formName,
        description: formDescription,
      });
    } catch (e: any) {
      // If server requires FACEIT profile and we have a faceit URL input available, try to link and retry
      const errMsg = e && e.message ? e.message : "";
      if (errMsg.toLowerCase().includes("faceit") && faceitUrlInput) {
        try {
          // Attempt to link FACEIT using the URL the user previously provided in the profile step
          await api.linkFaceit(faceitUrlInput.trim());
          // refresh user so local state reflects linked profile
          try {
            await refreshUser();
          } catch {}
          // retry lobby creation once
          await api.createLobby({
            tournamentId: formTournament,
            name: formName,
            description: formDescription,
          });
        } catch (e2: any) {
          alert(
            getActionError(
              e2,
              language === "fi"
                ? "Joukkueen luonti epäonnistui"
                : "Failed to create lobby",
            ),
          );
          setCreating(false);
          return;
        }
      } else {
        alert(
          getActionError(
            e,
            language === "fi"
              ? "Joukkueen luonti epäonnistui"
              : "Failed to create lobby",
          ),
        );
        setCreating(false);
        return;
      }
    }

    // success
    setShowCreate(false);
    setFormName("");
    setFormTournament("");
    setFormDescription("");
    setFaceitUrlInput("");
    try {
      setLobbies(await api.getLobbies());
    } catch (_) {}
    setCreating(false);
  };

  const joinSlot = async (lobbyId: string, slotId: string) => {
    if (!user) {
      alert(
        language === "fi"
          ? "Kirjaudu sisään liityäksesi"
          : "Please log in to join",
      );
      return;
    }
    try {
      // Submit a join request; captain will accept/reject
      await api.requestJoin(lobbyId, { slotId });
      alert(
        language === "fi"
          ? "Pyyntö lähetetty kapteenille"
          : "Request sent to captain",
      );
      setLobbies(await api.getLobbies());
    } catch (e: any) {
      alert(e.message || "Failed to submit request");
    }
  };

  const openRequests = async (lobbyId: string) => {
    setShowRequestsFor(lobbyId);
    setRequestsLoading(true);
    try {
      const r = await api.getLobbyRequests(lobbyId);
      setRequests(r || []);
    } catch (e) {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  const acceptRequest = async (lobbyId: string, reqId: string) => {
    try {
      await api.acceptRequest(lobbyId, reqId);
      await openRequests(lobbyId);
      setLobbies(await api.getLobbies());
    } catch (e: any) {
      alert(e.message || "Failed to accept");
    }
  };

  const rejectRequest = async (lobbyId: string, reqId: string) => {
    try {
      await api.rejectRequest(lobbyId, reqId);
      await openRequests(lobbyId);
      setLobbies(await api.getLobbies());
    } catch (e: any) {
      alert(e.message || "Failed to reject");
    }
  };

  const deleteLobby = async (lobbyId: string) => {
    if (
      !confirm(
        language === "fi"
          ? "Haluatko varmasti poistaa tämän joukkueen?"
          : "Are you sure you want to delete this team?",
      )
    )
      return;
    try {
      await api.deleteLobby(lobbyId);
      alert(language === "fi" ? "Joukkue poistettu" : "Team removed");
      setLobbies(await api.getLobbies());
    } catch (e: any) {
      alert(
        e.message ||
          (language === "fi" ? "Poisto epäonnistui" : "Failed to delete"),
      );
    }
  };

  const openChat = async (lobbyId: string) => {
    setShowChatFor(lobbyId);
    setChatLoading(true);
    try {
      const msgs = await api.getChatMessages(lobbyId);
      setChatMessages(msgs || []);
    } catch (e) {
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatMessage = async (lobbyId: string) => {
    if (!chatInput.trim()) return;
    try {
      setChatSending(true);
      await api.postChatMessage(lobbyId, chatInput.trim());
      setChatInput("");
      const msgs = await api.getChatMessages(lobbyId);
      setChatMessages(msgs || []);
    } catch (e: any) {
      alert(e.message || "Failed to send message");
    } finally {
      setChatSending(false);
    }
  };

  const getUser = (id?: string) => users.find((u) => u.id === id);
  const getTournament = (id: string) => tournaments.find((t) => t.id === id);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 uppercase">
          {language === "fi" ? "JOUKKUEHAKU" : "FIND TEAM"}
        </h1>
        <p className="text-neutral-400 max-w-2xl text-lg">
          {language === "fi"
            ? "Eikö sinulla ole vielä joukkuetta? Liity avoimeen kokoonpanoon tai kokoa oma joukkue turnauksia varten."
            : "Don’t have a team yet? Join an open roster or build your own for upcoming tournaments."}
        </p>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex flex-wrap gap-3">
          <button className="bg-neutral-900 border border-neutral-800 text-sm font-medium px-4 py-2 rounded flex items-center gap-2 hover:border-neutral-600 transition-colors">
            <Filter className="w-4 h-4 text-neutral-500" />
            {language === "fi" ? "Kaikki Turnaukset" : "All Tournaments"}
          </button>
          <button className="bg-neutral-900 border border-neutral-800 text-sm font-medium px-4 py-2 rounded flex items-center gap-2 hover:border-neutral-600 transition-colors">
            {language === "fi" ? "Rooli: Kaikki" : "Role: All"}
          </button>
          <button className="bg-neutral-900 border border-neutral-800 text-sm font-medium px-4 py-2 rounded flex items-center gap-2 hover:border-neutral-600 transition-colors">
            {language === "fi" ? "FACEIT Taso" : "FACEIT Level"}
          </button>
        </div>
        <button
          onClick={() => {
            if (!user) {
              navigate("/login");
              return;
            }
            if (!user.faceitId && !user.faceitUsername)
              setCreateStep("profile");
            else setCreateStep("form");
            setShowCreate(true);
          }}
          className="bg-white text-black font-bold px-6 py-2.5 rounded-sm hover:bg-neutral-200 transition-colors"
        >
          {language === "fi" ? "Luo joukkue" : "Create Team"}
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-900 border border-neutral-800 rounded p-5 sm:p-6 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {language === "fi" ? "Luo joukkue" : "Create Team"}
            </h3>
            {createStep === "profile" ? (
              <div className="flex flex-col gap-3">
                <p className="text-neutral-400">
                  {language === "fi"
                    ? "Sinulla ei ole vielä liitettyä FACEIT-profiilia. Linkitä FACEIT-profiilisi jatkaaksesi joukkueen luomista."
                    : "You don't have a linked FACEIT profile yet. Link your FACEIT profile to continue creating a team."}
                </p>
                <input
                  value={faceitUrlInput}
                  onChange={(e) => setFaceitUrlInput(e.target.value)}
                  placeholder={
                    language === "fi"
                      ? "FACEIT-profiilin URL tai nickname"
                      : "FACEIT profile URL or nickname"
                  }
                  className="bg-neutral-800 border border-neutral-700 px-3 py-2 rounded text-white"
                />
                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => {
                      setShowCreate(false);
                      setFaceitUrlInput("");
                    }}
                    className="px-4 py-2 rounded border border-neutral-700"
                  >
                    {language === "fi" ? "Peruuta" : "Cancel"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!faceitUrlInput) {
                        alert(
                          language === "fi"
                            ? "Anna FACEIT-URL"
                            : "Please provide FACEIT URL",
                        );
                        return;
                      }
                      try {
                        setFaceitVerifying(true);
                        await api.linkFaceit(faceitUrlInput.trim());
                        // Refresh client user so UI immediately reflects linked FACEIT profile
                        try {
                          await refreshUser();
                        } catch (refreshErr) {
                          /* ignore */
                        }
                        setCreateStep("form");
                        setFaceitUrlInput("");
                        setFaceitVerifying(false);
                        alert(
                          language === "fi"
                            ? "FACEIT profiili liitetty. Jatka luomaan joukkue."
                            : "FACEIT profile linked. Continue creating your team.",
                        );
                      } catch (e: any) {
                        setFaceitVerifying(false);
                        alert(
                          getActionError(
                            e,
                            language === "fi"
                              ? "FACEIT-profiilin linkitys epäonnistui"
                              : "Failed to link FACEIT profile",
                          ),
                        );
                      }
                    }}
                    disabled={faceitVerifying}
                    className="px-4 py-2 bg-white text-black font-bold rounded"
                  >
                    {faceitVerifying
                      ? language === "fi"
                        ? "Vahvistetaan..."
                        : "Verifying..."
                      : language === "fi"
                        ? "Jatka"
                        : "Continue"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={
                    language === "fi" ? "Joukkueen nimi" : "Team name"
                  }
                  className="bg-neutral-800 border border-neutral-700 px-3 py-2 rounded text-white"
                />
                <select
                  value={formTournament}
                  onChange={(e) => setFormTournament(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 px-3 py-2 rounded text-white"
                >
                  <option value="">
                    {language === "fi"
                      ? "Valitse turnaus"
                      : "Select tournament"}
                  </option>
                  {tournamentList.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name}
                    </option>
                  ))}
                </select>
                <input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={
                    language === "fi"
                      ? "Joukkueen kuvaus (valinnainen)"
                      : "Team description (optional)"
                  }
                  className="bg-neutral-800 border border-neutral-700 px-3 py-2 rounded text-white"
                />
                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 rounded border border-neutral-700"
                  >
                    {language === "fi" ? "Peruuta" : "Cancel"}
                  </button>
                  <button
                    onClick={createLobby}
                    disabled={creating}
                    className="px-4 py-2 bg-white text-black font-bold rounded"
                  >
                    {creating
                      ? language === "fi"
                        ? "Luo..."
                        : "Creating..."
                      : language === "fi"
                        ? "Luo joukkue"
                        : "Create Team"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showRequestsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-900 border border-neutral-800 rounded p-5 sm:p-6 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {language === "fi" ? "Pyynnöt" : "Requests"} —{" "}
              {lobbies.find((l) => l.id === showRequestsFor)?.name}
            </h3>
            {requestsLoading ? (
              <p className="text-neutral-400">Loading...</p>
            ) : (
              <div className="flex flex-col gap-3">
                {requests.length === 0 && (
                  <p className="text-neutral-400">
                    {language === "fi"
                      ? "Ei odottavia pyyntöjä"
                      : "No pending requests"}
                  </p>
                )}
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 p-3 rounded"
                  >
                    <div>
                      <div className="font-semibold">
                        {r.user?.username || r.userId}
                      </div>
                      {r.message && (
                        <div className="text-sm text-neutral-400">
                          {r.message}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => rejectRequest(showRequestsFor!, r.id)}
                        className="px-3 py-1 rounded border border-neutral-700"
                      >
                        {language === "fi" ? "Hylkää" : "Reject"}
                      </button>
                      <button
                        onClick={() => acceptRequest(showRequestsFor!, r.id)}
                        className="px-3 py-1 bg-white text-black font-bold rounded"
                      >
                        {language === "fi" ? "Hyväksy" : "Accept"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowRequestsFor(null)}
                className="px-4 py-2 rounded border border-neutral-700"
              >
                {language === "fi" ? "Sulje" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showChatFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-900 border border-neutral-800 rounded p-5 sm:p-6 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold mb-4">
              {language === "fi" ? "Tiimichat" : "Team Chat"} —{" "}
              {lobbies.find((l) => l.id === showChatFor)?.name}
            </h3>
            {chatLoading ? (
              <p className="text-neutral-400">Loading...</p>
            ) : (
              <div className="flex-1 overflow-auto max-h-96 space-y-3 mb-4">
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 bg-neutral-950 border border-neutral-800 rounded"
                  >
                    <div className="font-semibold text-sm">
                      {m.user?.username}
                    </div>
                    <div className="text-sm text-neutral-300">{m.content}</div>
                    <div className="text-xs text-neutral-600 mt-1">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-neutral-800 border border-neutral-700 px-3 py-2 rounded text-white"
                placeholder={
                  language === "fi" ? "Kirjoita viesti..." : "Type a message..."
                }
              />
              <button
                onClick={() => sendChatMessage(showChatFor!)}
                disabled={chatSending}
                className="px-4 py-3 sm:py-2 bg-white text-black font-bold rounded"
              >
                {language === "fi" ? "Lähetä" : "Send"}
              </button>
              <button
                onClick={() => setShowChatFor(null)}
                className="px-4 py-3 sm:py-2 rounded border border-neutral-700"
              >
                {language === "fi" ? "Sulje" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lobbies Grid */}
      <div className="flex flex-col gap-8">
        {lobbyList.map((lobby) => {
          const tournament = getTournament(lobby.tournamentId);

          // Prefer authoritative members when present
          const occupiedCount =
            lobby.members && lobby.members.length !== undefined
              ? lobby.members.length
              : lobby.slots.filter((s) => s.status === "occupied").length;
          const isReady = occupiedCount === 5;

          return (
            <div
              key={lobby.id}
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 sm:p-6"
            >
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-5 mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <span className="text-lg">🇫🇮</span> {lobby.name}
                  </h2>
                  <div className="text-neutral-400 text-sm mt-1 font-medium flex items-center gap-2">
                    <span>{tournament?.name}</span>
                    <span className="text-neutral-700">•</span>
                    <span className={isReady ? "text-green-500" : "text-white"}>
                      {occupiedCount} / 5 pelaajaa
                    </span>
                  </div>
                  {lobby.description && (
                    <p className="text-neutral-500 text-sm mt-3">
                      {lobby.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {(user?.role === "ADMIN" ||
                    user?.id === lobby.captainId ||
                    lobby.slots.some(
                      (s) =>
                        s.userId === user?.id ||
                        s.playerId === user?.id ||
                        (s.user && s.user.id === user?.id),
                    )) && (
                    <button
                      onClick={() => openChat(lobby.id)}
                      className="text-sm font-medium text-neutral-300 hover:text-white transition-colors bg-neutral-800 px-3 py-1 rounded"
                    >
                      {language === "fi" ? "Tiimichat" : "Team Chat"}
                    </button>
                  )}
                  {user?.id === lobby.captainId && (
                    <>
                      <button
                        onClick={() => openRequests(lobby.id)}
                        className="text-sm font-medium text-neutral-300 hover:text-white transition-colors bg-neutral-800 px-3 py-1 rounded"
                      >
                        {language === "fi"
                          ? "Hallinnoi pyyntöjä"
                          : "Manage Requests"}
                      </button>
                      <button
                        onClick={() => deleteLobby(lobby.id)}
                        className="text-sm font-medium text-red-400 hover:text-red-200 transition-colors bg-neutral-800 px-3 py-1 rounded ml-2"
                      >
                        {language === "fi" ? "Poista joukkue" : "Delete Team"}
                      </button>
                    </>
                  )}
                  {user?.role === "ADMIN" && user?.id !== lobby.captainId && (
                    <button
                      onClick={() => deleteLobby(lobby.id)}
                      className="text-sm font-medium text-red-400 hover:text-red-200 transition-colors bg-neutral-800 px-3 py-1 rounded ml-2"
                    >
                      {language === "fi"
                        ? "Poista joukkue (Admin)"
                        : "Delete Team (Admin)"}
                    </button>
                  )}
                  {isReady && (
                    <div className="bg-green-500/10 text-green-500 border border-green-500/20 px-4 py-2 rounded font-bold tracking-wide flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      {t("team.ready")}
                    </div>
                  )}
                </div>
              </div>

              {/* The 5 Slots (prefer authoritative lobby.members) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {
                  // Build a 5-entry view derived from members (authoritative) and lobby.slots (metadata fallback)
                  (() => {
                    const totalSlots = 5;
                    const membersByIndex = new Map<number, any>();
                    (lobby.members || []).forEach((m: any) => {
                      if (m && typeof m.slotIndex === "number")
                        membersByIndex.set(m.slotIndex, m);
                    });

                    const slotsToRender = Array.from({
                      length: totalSlots,
                    }).map((_, idx) => {
                      const member = membersByIndex.get(idx);

                      // determine slotMeta from lobby.slots by slotIndex if available, otherwise by order
                      let slotMeta: any = null;
                      if (lobby.slots && lobby.slots.length) {
                        slotMeta = lobby.slots.find((s: any) =>
                          typeof s.slotIndex === "number"
                            ? s.slotIndex === idx
                            : false,
                        );
                        if (!slotMeta) slotMeta = lobby.slots[idx];
                      }

                      if (member) return { kind: "member", member, slotMeta };

                      if (slotMeta) {
                        if (
                          slotMeta.status === "occupied" &&
                          (slotMeta.user ||
                            (slotMeta as any).userId ||
                            (slotMeta as any).playerId)
                        ) {
                          return { kind: "occupiedSlot", slot: slotMeta };
                        }
                        return { kind: "empty", slot: slotMeta };
                      }

                      return { kind: "empty", slot: null };
                    });

                    return slotsToRender.map((entry, idx) => {
                      if (entry.kind === "member") {
                        // Prefer member.user if included, otherwise try to fetch from users list
                        const mem = entry.member;
                        const player = mem.user
                          ? mem.user
                          : getUser(mem.userId);
                        return (
                          <Link
                            key={`m-${idx}`}
                            to={`/profile/${player?.id}`}
                            className="bg-neutral-950 border border-neutral-800 rounded p-4 flex flex-col items-center justify-center gap-3 hover:border-neutral-600 transition-colors group cursor-pointer h-40 relative"
                          >
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-neutral-600">
                              P{idx + 1}
                            </span>
                            <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center font-bold text-xl border border-neutral-700 group-hover:border-neutral-500 transition-colors overflow-hidden">
                              {player?.faceitAvatar ||
                              mem.faceitProfile?.avatar ||
                              player?.avatar ? (
                                <img
                                  src={
                                    player?.faceitAvatar ||
                                    mem.faceitProfile?.avatar ||
                                    player?.avatar
                                  }
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (
                                  player?.username ||
                                  mem.faceitProfile?.username ||
                                  "?"
                                ).charAt(0)
                              )}
                            </div>
                            <div className="text-center">
                              <div className="font-semibold">
                                {player?.username ||
                                  mem.faceitProfile?.username ||
                                  "Player"}
                              </div>
                              <div className="text-xs text-neutral-400 mt-0.5 flex flex-col items-center gap-1">
                                {(player?.faceitLevel ??
                                  mem.faceitProfile?.level) != null && (
                                  <span
                                    className={`${faceitTierClass(player?.faceitLevel ?? mem.faceitProfile?.level, player?.faceitElo ?? mem.faceitProfile?.elo)} px-1.5 py-0.5 rounded text-[10px] font-bold`}
                                  >
                                    Lvl{" "}
                                    {player?.faceitLevel ??
                                      mem.faceitProfile?.level}
                                  </span>
                                )}
                                {(player?.faceitElo ??
                                  mem.faceitProfile?.elo) != null && (
                                  <span
                                    className={faceitTierClass(
                                      player?.faceitLevel ??
                                        mem.faceitProfile?.level,
                                      player?.faceitElo ??
                                        mem.faceitProfile?.elo,
                                    )}
                                  >
                                    Elo{" "}
                                    {player?.faceitElo ??
                                      mem.faceitProfile?.elo}
                                  </span>
                                )}
                                <span>{player?.role || mem.role}</span>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      if (entry.kind === "occupiedSlot") {
                        const slot = entry.slot;
                        const player = slot.user
                          ? slot.user
                          : getUser(
                              (slot as any).userId || (slot as any).playerId,
                            );
                        return (
                          <Link
                            key={`socc-${idx}`}
                            to={`/profile/${player?.id}`}
                            className="bg-neutral-950 border border-neutral-800 rounded p-4 flex flex-col items-center justify-center gap-3 hover:border-neutral-600 transition-colors group cursor-pointer h-40 relative"
                          >
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-neutral-600">
                              P{idx + 1}
                            </span>
                            <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center font-bold text-xl border border-neutral-700 group-hover:border-neutral-500 transition-colors overflow-hidden">
                              {safeString(player?.faceitAvatar || player?.avatar) ? (
                                <img
                                  src={safeString(player?.faceitAvatar || player?.avatar, "#")}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (player?.username || "?").charAt(0)
                              )}
                            </div>
                            <div className="text-center">
                              <div className="font-semibold">
                                {player?.username}
                              </div>
                              <div className="text-xs text-neutral-400 mt-0.5 flex flex-col items-center gap-1">
                                {player?.faceitLevel != null && (
                                  <span
                                    className={`${faceitTierClass(player.faceitLevel, player.faceitElo)} px-1.5 py-0.5 rounded text-[10px] font-bold`}
                                  >
                                    Lvl {player.faceitLevel}
                                  </span>
                                )}
                                {player?.faceitElo != null && (
                                  <span
                                    className={faceitTierClass(
                                      player.faceitLevel,
                                      player.faceitElo,
                                    )}
                                  >
                                    Elo {player.faceitElo}
                                  </span>
                                )}
                                <span>{player?.role}</span>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      // empty slot
                      const slot = entry.slot;
                      const requestedRole = slot?.requestedRole;
                      const minFaceitLevel = slot?.minFaceitLevel;
                      return (
                        <button
                          key={`empty-${idx}`}
                          onClick={() => joinSlot(lobby.id, slot?.id)}
                          className="bg-neutral-950 border border-dashed border-neutral-700 rounded p-4 flex flex-col items-center justify-center gap-3 hover:bg-neutral-900 hover:border-neutral-500 transition-all cursor-pointer h-40 group relative"
                        >
                          <span className="absolute top-2 left-2 text-[10px] font-bold text-neutral-600">
                            P{idx + 1}
                          </span>
                          <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 group-hover:text-white group-hover:scale-110 transition-all">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-neutral-400 group-hover:text-white transition-colors">
                              {t("common.free_slot")}
                            </div>
                            <div className="text-xs text-neutral-600 mt-1">
                              {requestedRole && <span>{requestedRole}</span>}
                              {minFaceitLevel && (
                                <span> • Lvl {minFaceitLevel}+</span>
                              )}
                            </div>
                          </div>
                          <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] uppercase font-bold text-white bg-neutral-800 px-2 py-1 rounded">
                              {t("common.join_team")}
                            </span>
                          </div>
                        </button>
                      );
                    });
                  })()
                }
              </div>

              {isReady && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-neutral-950 border border-neutral-800 p-4 rounded gap-4">
                  <p className="text-sm text-neutral-400">
                    {language === "fi"
                      ? "Ottelut pelataan FACEITissä. Jokaisen pelaajan tulee liittyä vastaavaan joukkueeseen."
                      : "Matches are played on FACEIT. Every player must join the corresponding team."}
                  </p>
                  <div className="flex gap-4 w-full sm:w-auto">
                    <button className="bg-white text-black font-bold px-6 py-2.5 rounded-sm hover:bg-neutral-200 transition-colors whitespace-nowrap w-full sm:w-auto">
                      {language === "fi"
                        ? "ILMOITTAUDU TURNAUKSEEN"
                        : "REGISTER FOR TOURNAMENT"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "../contexts/TranslationContext";
import { useAuth } from "../contexts/AuthContext";
import { KarjalanMark } from "../components/KarjalanMark";
import { apiFetch } from "../lib/http";

export default function Auth() {
  const { t, language } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname === "/register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body = isRegister
      ? { username, email, password }
      : { email, password };

    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Autentikointi epäonnistui");
      }

      login(data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 min-h-[70vh]">
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-lg w-full max-w-md">
        <div className="flex justify-center mb-4">
          <KarjalanMark className="w-16 h-16" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-center uppercase">
          KARJALAN
        </h1>
        <p className="text-neutral-400 text-sm text-center mb-8">
          {isRegister
            ? language === "fi"
              ? "Luo uusi käyttäjätunnus osallistuaksesi."
              : "Create a new account to join the tournaments."
            : language === "fi"
              ? "Kirjaudu sisään hallitaksesi joukkuettasi ja osallistuaksesi turnauksiin."
              : "Log in to manage your team and compete in tournaments."}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <input
              type="text"
              placeholder={language === "fi" ? "Käyttäjänimi" : "Username"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 px-4 py-3 rounded text-white focus:outline-none focus:border-neutral-500"
              required
            />
          )}
          <input
            type="email"
            placeholder={language === "fi" ? "Sähköpostiosoite" : "Email address"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 px-4 py-3 rounded text-white focus:outline-none focus:border-neutral-500"
            required
          />
          <input
            type="password"
            placeholder={language === "fi" ? "Salasana" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 px-4 py-3 rounded text-white focus:outline-none focus:border-neutral-500"
            required
          />

          <button
            type="submit"
            className="bg-white hover:bg-neutral-200 text-black font-bold px-4 py-3 rounded-sm transition-colors mt-2"
          >
            {isRegister
              ? language === "fi"
                ? "REKISTERÖIDY"
                : "REGISTER"
              : language === "fi"
                ? "KIRJAUDU SISÄÄN"
                : "LOG IN"}
          </button>

          {!isRegister && (
            <button
              type="button"
              className="bg-[#FF5500] hover:bg-[#FF5500]/90 text-white font-bold px-4 py-3 rounded-sm transition-colors flex items-center justify-center gap-3"
            >
              {language === "fi"
                ? "KIRJAUDU FACEIT-TUNNUKSELLA (Tulossa)"
                : "LOG IN WITH FACEIT (Coming soon)"}
            </button>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-800 text-center flex flex-col gap-2">
          <Link
            to={isRegister ? "/login" : "/register"}
            className="text-sm font-medium text-white hover:underline"
          >
            {isRegister
              ? language === "fi"
                ? "Onko sinulla jo tunnus? Kirjaudu sisään."
                : "Already have an account? Log in."
              : language === "fi"
                ? "Eikö sinulla ole tunnusta? Rekisteröidy."
                : "Don’t have an account? Register."}
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-neutral-500 hover:text-white mt-4"
          >
            {language === "fi" ? "Palaa etusivulle" : "Back to home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

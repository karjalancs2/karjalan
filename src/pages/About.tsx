import {
  ArrowRight,
  Mail,
  MessageCircle,
  Trophy,
  TrendingUp,
  Users,
} from "lucide-react";

const stats = [
  { value: "0", label: "Rekisteröityä pelaajaa", icon: Users },
  { value: "0", label: "Pelattuja turnauksia", icon: Trophy },
  { value: "0", label: "Aktiivisia joukkueita", icon: TrendingUp },
];

const steps = [
  {
    number: "01",
    title: "Löydä tiimi",
    description:
      "Etsi sopivia pelikavereita ja kokoa joukkue, jolla tavoittelet seuraavaa tasoa.",
    icon: Users,
  },
  {
    number: "02",
    title: "Kisaa turnauksissa",
    description:
      "Mittaa tasosi kovia vastustajia vastaan ammattimaisesti järjestetyissä turnauksissa.",
    icon: Trophy,
  },
  {
    number: "03",
    title: "Nouse huipulle",
    description:
      "Kehitä peliäsi, kerää kokemusta ja rakenna matkaasi kohti suomalaisen CS2:n kärkeä.",
    icon: TrendingUp,
  },
];

export default function About() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <section className="relative overflow-hidden border border-neutral-800 bg-neutral-900/50 p-8 sm:p-12 lg:p-16">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-red-500">
            Karjalan · Espoo, Suomi
          </p>
          <h1 className="mb-8 text-4xl font-black uppercase tracking-tight sm:text-6xl">
            Meistä
          </h1>
          <p className="text-lg leading-8 text-neutral-300 sm:text-xl sm:leading-9">
            Karjalan on Espoosta ponnistava, puhtaasti kilpapelaamiseen ja
            laadukkaaseen turnausjärjestämiseen keskittyvä organisaatio.
            Missiomme on selkeä: haluamme kaventaa kuilua ruohonjuuritason
            amatööripelaamisen ja ammattilaistason välillä. Tiedämme, että matka
            viikonloppupeleistä huipulle vaatii paitsi yksilötaitoa, myös
            oikeanlaisen ympäristön, kovatasoisia vastustajia ja saumattomasti
            toimivat puitteet. Tarjoamme alustan, jossa jokainen pelaaja ja
            joukkue voi mitata tasoaan ammattimaisesti johdetuissa turnauksissa,
            kehittää peliään ja löytää puuttuvat palaset omaan kokoonpanoonsa.
            Olitpa sitten rakentamassa uutta tiimiä nollasta tai hakemassa kovia
            virallisia matseja nykyiselle rosterillesi, Karjalan tarjoaa siihen
            teknisesti ylivertaisen ja yhteisöllisen alustan. Yhdistämme
            toiminnassamme huippuunsa hiotun suorituskyvyn ja tinkimättömän
            intohimon suomalaiseen kilpapelaamiseen.
          </p>
        </div>
      </section>

      <section
        aria-label="Karjalan tilastot"
        className="mt-6 grid gap-4 sm:grid-cols-3"
      >
        {stats.map(({ value, label, icon: Icon }) => (
          <article
            key={label}
            className="border border-neutral-800 bg-black/60 p-6 sm:p-7"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                {label}
              </span>
              <Icon className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <p className="font-mono text-4xl font-bold text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-24">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-red-500">
            Pelaajasta kilpailijaksi
          </p>
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Polku huipulle
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(({ number, title, description, icon: Icon }, index) => (
            <article
              key={number}
              className="relative border border-neutral-800 bg-neutral-900/40 p-7 sm:p-8"
            >
              <div className="mb-10 flex items-center justify-between">
                <span className="font-mono text-sm text-neutral-600">
                  {number} / 03
                </span>
                <Icon
                  className="h-6 w-6 text-red-500"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mb-3 text-xl font-bold uppercase tracking-wide">
                {title}
              </h3>
              <p className="leading-7 text-neutral-400">{description}</p>
              {index < steps.length - 1 && (
                <ArrowRight
                  className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 text-neutral-600 md:block"
                  aria-hidden="true"
                />
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-red-500">
            Rakennetaan yhdessä
          </p>
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Ota yhteyttä
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="mailto:contact@karjalan.net"
            className="group flex items-start gap-5 border border-neutral-800 bg-neutral-900/40 p-7 transition-colors hover:border-neutral-600 sm:p-8"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-neutral-700 bg-black text-red-500">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-neutral-500">
                Sähköposti
              </span>
              <span className="text-lg font-semibold text-white group-hover:text-red-400">
                contact@karjalan.net
              </span>
            </span>
          </a>
          <a
            href="https://discord.gg/29mjT4eqR"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-5 border border-neutral-800 bg-neutral-900/40 p-7 transition-colors hover:border-neutral-600 sm:p-8"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-neutral-700 bg-black text-red-500">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-neutral-500">
                Discord-tuki
              </span>
              <span className="text-lg font-semibold text-white group-hover:text-red-400">
                Avaa tukitiketti #avaa-tiketti -kanavalla
              </span>
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}

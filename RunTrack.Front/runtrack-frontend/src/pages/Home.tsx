import { useNavigate } from "react-router-dom";
import { Linkedin, Github } from "lucide-react";

const media = (path: string) => `${import.meta.env.BASE_URL}media/${path}`;

const coachName = "Grupo de entrenamiento";
const creatorName = "Marcos Barberis";

const phrases = [
  "Corre con nosotros",
  "Celebra cada paso que estés dando",
  "Entrenando como equipo, latiendo como familia",
];

const gallery = [
  { src: media("runners/runner-1.jpg"), alt: "Recorrido: fondo suave, 12,4 km" },
  { src: media("runners/runner-2.jpg"), alt: "Recorrido: pasadas 6 x 400 m" },
  { src: media("events/event-1.jpg"), alt: "Recorrido: carrera 10K" },
  { src: media("events/event-2.jpg"), alt: "Recorrido: fartlek 30 minutos" },
  { src: media("events/event-3.jpg"), alt: "Recorrido: cuestas" },
  { src: media("runners/runner-3.jpg"), alt: "Recorrido: técnica de carrera" },
  { src: media("runners/runner-4.jpg"), alt: "Recorrido: cambios de ritmo" },
  { src: media("runners/runner-5.jpg"), alt: "Recorrido: rodaje libre" },
  { src: media("events/event-4.jpg"), alt: "Recorrido: media maratón" },
];

const videos = [
  { src: media("videos/highlight.mp4"), title: "Fondo del domingo" },
  { src: media("videos/highlight2.mp4"), title: "Circuito costanera" },
  { src: media("videos/highlight3.mp4"), title: "Recorrido urbano" },
];

export default function Home() {
  const nav = useNavigate();

  return (
    <div className="space-y-20 animate-fadeIn">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40">
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 25%, rgba(34,197,94,0.55), transparent 45%), radial-gradient(circle at 60% 20%, rgba(236,72,153,0.45), transparent 40%), radial-gradient(circle at 85% 20%, rgba(250,204,21,0.45), transparent 42%)",
          }}
        />

        <div className="relative p-10 md:p-16 text-center">
          {/* Coach */}
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-700 bg-slate-950/40 backdrop-blur px-6 py-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider">
              Coach
            </span>
            <span className="text-lg font-semibold bg-gradient-to-r from-primary-300 to-accent-400 bg-clip-text text-transparent">
              {coachName}
            </span>
          </div>

          {/* LOGO */}
          <div className="mt-8 flex justify-center">
            <div className="rounded-3xl border border-slate-800 bg-black/30 p-6 shadow-lg">
              <img
                src={media("brand/logo.png")}
                alt="RunTrack"
                className="h-20 md:h-24 w-auto"
              />
            </div>
          </div>

          {/* TITULO COLORIDO */}
          <h1 className="mt-8 text-5xl md:text-7xl font-extrabold font-display tracking-tight bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            ¡Corré con nosotros!
          </h1>

          

          {/* FRASES SECUNDARIAS */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <span className="px-4 py-2 rounded-full border border-slate-700 bg-slate-950/40 text-slate-200 text-sm">
              {phrases[2]}
            </span>
            <span className="px-4 py-2 rounded-full border border-slate-700 bg-slate-950/40 text-slate-200 text-sm">
              {phrases[1]}
            </span>
          </div>

          {/* BOTONES */}
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => nav("/login")}
              className="px-8 py-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-black font-semibold text-lg transition"
              type="button"
            >
              Entrar a la plataforma
            </button>

            <button
              onClick={() => {
                const el = document.getElementById("videos");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-4 rounded-2xl border border-accent-400/60 hover:bg-accent-500/10 text-slate-100 font-semibold text-lg transition"
              type="button"
            >
              Ver videos
            </button>

            <a
              href="https://github.com/MarcosBarberis/RunTrack-Portfolio"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 rounded-2xl border border-highlight-400/60 hover:bg-highlight-500/10 text-slate-100 font-semibold text-lg transition inline-flex items-center justify-center gap-2"
            >
              <Github className="w-5 h-5" />
              Ver código
            </a>
          </div>
        </div>
      </section>

      {/* ================= GALERÍA ================= */}
      <section id="galeria" className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Galería
          </h2>
          <p className="text-slate-400 mt-2">
            Recorridos de ejemplo del grupo (datos ficticios).
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {gallery.map((g) => (
            <div
              key={g.src}
              className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-black/40 shadow-sm"
            >
              <div className="aspect-[4/5] w-full overflow-hidden">
                <img
                  src={g.src}
                  alt={g.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition pointer-events-none"
                style={{
                  background:
                    "linear-gradient(120deg, rgba(34,197,94,0.18), rgba(236,72,153,0.18), rgba(250,204,21,0.18))",
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ================= VIDEOS ================= */}
      <section id="videos" className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Videos
          </h2>
          <p className="text-slate-400 mt-2">
            
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {videos.map((v) => (
            <div
              key={v.src}
              className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <p className="text-sm text-slate-200 font-semibold text-center">
                {v.title}
              </p>

              <div className="mt-4 mx-auto aspect-[9/16] max-h-[600px] rounded-2xl overflow-hidden bg-black/50 border border-slate-800">
                <video
                  className="w-full h-full object-contain"
                  src={v.src}
                  controls
                  playsInline
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="pt-6 pb-12 text-center text-sm text-slate-400">
        RunTrack • Creado por{" "}
        <a
          href="https://www.linkedin.com/in/marcos-david-barberis-valle-437462307/"
          target="_blank"
          rel="noreferrer"
          className="text-slate-300 font-semibold hover:text-primary-400 transition inline-flex items-center gap-1"
        >
          <Linkedin className="w-4 h-4" />
          {creatorName}
        </a>
      </footer>
    </div>
  );
}
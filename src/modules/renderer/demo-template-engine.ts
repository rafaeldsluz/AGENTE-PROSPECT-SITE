import type { TemplateData } from "../../types/template.types.js";
import type { Niche } from "../../types/business.types.js";

// ── Shared utilities ──────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initial(name: string): string {
  return (name.trim().charAt(0) || "E").toUpperCase();
}

function waUrl(whatsapp: string, message: string): string {
  const digits = whatsapp.replace(/\D/g, "");
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

function starsFull(rating: number): string {
  const full = Math.min(5, Math.round(rating));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

// WhatsApp SVG path data (shared across all templates)
const WA_PATH = `<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/>`;

function waSvg(cls = "w-5 h-5 fill-white"): string {
  return `<svg class="${cls}" viewBox="0 0 24 24">${WA_PATH}</svg>`;
}

// ── Clinica ───────────────────────────────────────────────────────────────────

function renderClinica(d: TemplateData): string {
  const wa = waUrl(d.whatsapp, d.whatsappMessage);

  const logoHtml = d.logoUrl
    ? `<img src="${esc(d.logoUrl)}" alt="${esc(d.companyName)}" class="w-9 h-9 rounded-xl object-cover shadow-lg shadow-sky-200" />`
    : `<div class="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-sky-200">${initial(d.companyName)}</div>`;

  const ratingBadge = d.rating && d.reviewCount
    ? `<div class="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-100">
        <div class="flex items-center gap-2">
          <div class="flex text-yellow-400 text-sm">${starsFull(d.rating)}</div>
          <span class="text-slate-700 font-semibold text-sm">${d.rating.toFixed(1)}</span>
          <span class="text-slate-400 text-xs">(${d.reviewCount} avaliações)</span>
        </div>
      </div>` : "";

  const ratingCard = d.rating && d.reviewCount
    ? `<div class="flex items-center gap-3 mb-6">
        <div class="flex text-yellow-400">${starsFull(d.rating)}</div>
        <span class="text-slate-700 font-semibold">${d.rating.toFixed(1)}</span>
        <span class="text-slate-400 text-sm">· ${d.reviewCount}+ avaliações</span>
      </div>` : "";

  const floatRating = d.rating
    ? `<div class="absolute -top-4 -right-4 card-glass border border-cyan-100 rounded-2xl px-4 py-3 shadow-lg z-10">
        <div class="flex items-center gap-2"><span class="text-yellow-400">★</span><span class="text-slate-800 font-bold text-sm">${d.rating.toFixed(1)}/5</span></div>
        <p class="text-slate-400 text-xs mt-0.5">Google Reviews</p>
      </div>` : "";

  const serviceCards = d.services.slice(0, 4).map((s) => `
    <div class="group bg-white rounded-3xl p-7 shadow-sm border border-slate-100 hover:shadow-xl hover:border-cyan-100 hover:-translate-y-1 transition-all duration-300">
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-50 to-sky-100 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">${esc(s.icon)}</div>
      <h3 class="text-slate-800 font-semibold text-base mb-2">${esc(s.name)}</h3>
      <p class="text-slate-400 text-sm leading-relaxed">${esc(s.description)}</p>
    </div>`).join("\n");

  const differentialItems = d.differentials.slice(0, 4).map((diff) => `
    <div class="flex items-start gap-4">
      <div class="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-cyan-200">
        <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"/></svg>
      </div>
      <span class="text-slate-600 text-sm leading-relaxed">${esc(diff)}</span>
    </div>`).join("\n");

  const igLink = d.instagram
    ? `<a href="https://instagram.com/${esc(d.instagram.replace("@", ""))}" target="_blank" class="hover:text-cyan-400 transition-colors">${esc(d.instagram)}</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(d.companyName)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Fraunces:ital,wght@0,700;1,700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'DM Sans', sans-serif; }
    .display { font-family: 'Fraunces', serif; }
    .hero-mesh {
      background-color: #f0f9ff;
      background-image: radial-gradient(at 20% 50%, rgba(14,165,233,0.08) 0px, transparent 50%),
        radial-gradient(at 80% 20%, rgba(6,182,212,0.06) 0px, transparent 50%),
        radial-gradient(at 50% 90%, rgba(56,189,248,0.05) 0px, transparent 50%);
    }
    .card-glass { background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); }
    .cta-gradient { background: linear-gradient(135deg, #0284c7 0%, #0891b2 50%, #06b6d4 100%); }
    .whatsapp-ring { animation: ring 2.5s ease-in-out infinite; }
    @keyframes ring { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.3); } 60% { box-shadow: 0 0 0 14px rgba(34,197,94,0); } }
    .hero-photo {
      background-image: url('https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=700&q=80&fit=crop');
      background-size: cover; background-position: center;
    }
    .clinic-photo {
      background-image: linear-gradient(to bottom, rgba(240,249,255,0.10), rgba(240,249,255,0.80)),
        url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=900&q=80&fit=crop');
      background-size: cover; background-position: center;
    }
    .badge-pill { background: linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08)); border: 1px solid rgba(14,165,233,0.2); }
  </style>
</head>
<body class="bg-white text-slate-800 antialiased">

  <nav class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        ${logoHtml}
        <span class="font-semibold text-slate-800">${esc(d.companyName)}</span>
      </div>
      <div class="hidden md:flex items-center gap-8 text-slate-500 text-sm">
        <a href="#servicos" class="hover:text-cyan-600 transition-colors">Serviços</a>
        <a href="#diferenciais" class="hover:text-cyan-600 transition-colors">Diferenciais</a>
        <a href="#contato" class="hover:text-cyan-600 transition-colors">Contato</a>
      </div>
      <a href="${wa}" target="_blank" class="whatsapp-ring inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-green-200/50">
        ${waSvg("w-4 h-4 fill-white")}
        ${esc(d.ctaText)}
      </a>
    </div>
  </nav>

  <section class="hero-mesh pt-16 min-h-screen flex items-center relative overflow-hidden">
    <div class="max-w-6xl mx-auto px-6 py-24 relative z-10 w-full">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div class="badge-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-cyan-700 text-xs font-medium mb-7">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
            📍 ${esc(d.city)} · Atendimento Especializado
          </div>
          <h1 class="display text-5xl md:text-6xl font-bold leading-tight text-slate-900 mb-6">${esc(d.heroHeadline)}</h1>
          <p class="text-slate-500 text-lg leading-relaxed mb-10 font-light max-w-lg">${esc(d.heroSubtitle)}</p>
          <div class="flex flex-col sm:flex-row gap-4 mb-12">
            <a href="${wa}" target="_blank" class="whatsapp-ring inline-flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all shadow-xl shadow-green-200/60">
              ${waSvg()}
              ${esc(d.ctaText)}
            </a>
            <a href="tel:${d.whatsapp}" class="inline-flex items-center justify-center gap-2 bg-white text-slate-700 font-medium text-base px-8 py-4 rounded-2xl border border-slate-200 transition-all shadow-sm">
              ${esc(d.phone)}
            </a>
          </div>
          ${ratingBadge}
        </div>
        <div class="hidden lg:flex justify-end">
          <div class="relative">
            <div class="hero-photo w-80 h-96 rounded-3xl shadow-2xl shadow-sky-100/60 overflow-hidden border border-cyan-100/30"></div>
            <div class="absolute inset-0 rounded-3xl bg-gradient-to-t from-sky-900/40 via-transparent to-transparent pointer-events-none"></div>
            ${floatRating}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="servicos" class="py-28 bg-white">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-cyan-600 font-medium text-xs uppercase tracking-[0.25em] block mb-3">O que oferecemos</span>
        <h2 class="display text-4xl md:text-5xl font-bold text-slate-900 mb-4">Serviços <span class="text-cyan-500">Especializados</span></h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">${serviceCards}</div>
    </div>
  </section>

  <div class="clinic-photo h-56 w-full"></div>

  <section id="diferenciais" class="py-28 bg-slate-50">
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <span class="text-cyan-600 font-medium text-xs uppercase tracking-[0.25em] block mb-4">Por que nos escolher</span>
          <h2 class="display text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">Excelência em<br />cada <span class="text-cyan-500">detalhe</span></h2>
          <div class="space-y-4">${differentialItems}</div>
        </div>
        <div class="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          ${ratingCard}
          <div class="bg-gradient-to-r from-cyan-500 to-sky-600 rounded-2xl p-6 text-white text-center">
            <p class="font-semibold text-lg mb-1">${esc(d.companyName)}</p>
            <p class="text-cyan-100 text-sm mb-5">${esc(d.city)} · Atendimento humanizado</p>
            <a href="${wa}" target="_blank" class="inline-flex items-center gap-2 bg-white text-cyan-600 font-bold text-sm px-6 py-3 rounded-xl hover:bg-cyan-50 transition-all shadow-lg">
              ${esc(d.ctaText)} pelo WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="contato" class="cta-gradient py-24">
    <div class="max-w-2xl mx-auto px-6 text-center">
      <p class="text-cyan-200 text-xs uppercase tracking-widest mb-4">Fale conosco</p>
      <h2 class="display text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">${esc(d.heroHeadline)}</h2>
      <p class="text-cyan-100 text-lg mb-10 font-light">Atendimento rápido pelo WhatsApp. Sem burocracia.</p>
      <a href="${wa}" target="_blank" class="inline-flex items-center gap-3 bg-white text-cyan-600 font-bold text-lg px-12 py-5 rounded-2xl hover:bg-cyan-50 transition-all shadow-2xl shadow-cyan-900/30">
        ${waSvg("w-6 h-6 fill-green-500")}
        ${esc(d.ctaText)}
      </a>
    </div>
  </section>

  <footer class="bg-slate-900 text-slate-400 py-8">
    <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <p class="text-white font-semibold">${esc(d.companyName)}</p>
        <p class="text-sm mt-0.5">${esc(d.address)} — ${esc(d.city)}</p>
      </div>
      <div class="flex items-center gap-6 text-sm">
        ${igLink}
        <span>${esc(d.phone)}</span>
      </div>
    </div>
  </footer>

</body>
</html>`;
}

// ── Advogado ──────────────────────────────────────────────────────────────────

function renderAdvogado(d: TemplateData): string {
  const wa = waUrl(d.whatsapp, d.whatsappMessage);

  const areaCards = d.services.slice(0, 4).map((s, i) => `
    <div class="group relative overflow-hidden">
      <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div class="relative p-8 border border-stone-200/60 hover:border-amber-400/40 transition-all duration-400 bg-white/5">
        <span class="block text-amber-500/60 font-mono text-xs tracking-[0.3em] mb-5">0${i + 1}</span>
        <div class="text-2xl mb-4 opacity-80">${esc(s.icon)}</div>
        <h3 class="text-stone-100 font-semibold text-lg mb-3">${esc(s.name)}</h3>
        <p class="text-stone-400 text-sm leading-relaxed">${esc(s.description)}</p>
      </div>
    </div>`).join("\n");

  const differentialItems = d.differentials.slice(0, 4).map((diff) => `
    <div class="flex items-start gap-4 py-4 border-b border-stone-800/50 last:border-0">
      <div class="w-6 h-6 rounded-full border border-amber-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"/></svg>
      </div>
      <span class="text-stone-300 text-sm leading-relaxed">${esc(diff)}</span>
    </div>`).join("\n");

  const ratingLine = d.rating
    ? `<div class="serif text-5xl font-bold gold mb-1">${d.rating.toFixed(1)}★</div>
       <p class="text-stone-500 text-xs uppercase tracking-widest mb-6">Avaliado no Google</p>`
    : "";

  const igLink = d.instagram
    ? `<span>${esc(d.instagram)}</span>` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(d.companyName)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root { --gold: #b8973d; --gold-light: #d4af5a; --ink: #0c0c0e; }
    body { font-family: 'Inter', sans-serif; background: var(--ink); color: #e5e1d8; }
    .serif { font-family: 'Cormorant Garamond', serif; }
    .gold { color: var(--gold-light); }
    .hero-img {
      background-image: linear-gradient(to right, rgba(12,12,14,0.97) 40%, rgba(12,12,14,0.60) 100%),
        url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1400&q=80&fit=crop');
      background-size: cover; background-position: center right;
    }
    .aside-img {
      background-image: linear-gradient(to bottom, rgba(26,26,31,0.70), rgba(12,12,14,0.95)),
        url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80&fit=crop');
      background-size: cover; background-position: center;
    }
    .hero-line { height: 1px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); }
    .hero-marquee { animation: marquee 30s linear infinite; white-space: nowrap; }
    @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .wp-float { animation: float 3s ease-in-out infinite; }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  </style>
</head>
<body class="antialiased">

  <nav class="fixed top-0 left-0 right-0 z-50 border-b border-stone-800/50 backdrop-blur-xl bg-black/60">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <span class="serif text-xl font-semibold text-amber-300">${esc(d.companyName)}</span>
      <div class="hidden md:flex items-center gap-8 text-stone-400 text-sm">
        <a href="#areas" class="hover:text-amber-400 transition-colors">Áreas de Atuação</a>
        <a href="#escritorio" class="hover:text-amber-400 transition-colors">O Escritório</a>
        <a href="#contato" class="hover:text-amber-400 transition-colors">Contato</a>
      </div>
      <a href="${wa}" target="_blank" class="inline-flex items-center gap-2 border border-amber-600/50 hover:border-amber-400 text-amber-400 text-xs font-medium tracking-widest uppercase px-5 py-2.5 transition-all duration-200">
        ${esc(d.ctaText)}
      </a>
    </div>
  </nav>

  <div class="pt-16 border-b border-stone-800/30 bg-stone-950/80 overflow-hidden py-3">
    <div class="hero-marquee inline-flex gap-16 text-stone-600 text-xs tracking-[0.3em] uppercase">
      <span>Advocacia</span><span class="text-amber-700">·</span><span>Consultoria</span><span class="text-amber-700">·</span><span>Assessoria</span><span class="text-amber-700">·</span><span>Contratos</span><span class="text-amber-700">·</span><span>Litígios</span><span class="text-amber-700">·</span>
      <span>Advocacia</span><span class="text-amber-700">·</span><span>Consultoria</span><span class="text-amber-700">·</span><span>Assessoria</span><span class="text-amber-700">·</span><span>Contratos</span><span class="text-amber-700">·</span><span>Litígios</span><span class="text-amber-700">·</span>
    </div>
  </div>

  <section class="hero-img min-h-[90vh] flex flex-col justify-center relative overflow-hidden">
    <div class="relative z-10 max-w-6xl mx-auto px-6 py-32">
      <div class="max-w-3xl">
        <div class="flex items-center gap-3 mb-10">
          <div class="w-8 h-px border-t border-amber-600"></div>
          <span class="text-amber-500/70 text-xs tracking-[0.35em] uppercase font-medium">${esc(d.city)} · Advocacia</span>
        </div>
        <h1 class="serif text-6xl md:text-7xl lg:text-8xl font-bold leading-none mb-8">
          <span class="block text-stone-100">${esc(d.heroHeadline.split(" ").slice(0, 3).join(" "))}</span>
          <span class="block gold italic">${esc(d.heroHeadline.split(" ").slice(3).join(" ") || d.heroHeadline)}</span>
        </h1>
        <div class="hero-line mb-8 max-w-xs"></div>
        <p class="text-stone-400 text-lg leading-relaxed mb-12 max-w-xl font-light">${esc(d.heroSubtitle)}</p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="${wa}" target="_blank" class="wp-float inline-flex items-center gap-3 bg-green-700 hover:bg-green-600 text-white font-medium text-sm px-8 py-4 transition-all duration-200">
            ${waSvg()}
            Falar com Advogado
          </a>
          <a href="tel:${d.whatsapp}" class="inline-flex items-center gap-3 border border-stone-700 hover:border-amber-600/50 text-stone-300 hover:text-amber-300 font-light text-sm px-8 py-4 transition-all duration-200">
            ${esc(d.phone)}
          </a>
        </div>
      </div>
      <div class="mt-24 grid grid-cols-3 gap-px bg-stone-800/30 border border-stone-800/30">
        <div class="bg-stone-950/80 px-8 py-6">
          <div class="serif text-3xl font-bold gold mb-1">${d.reviewCount ? d.reviewCount + "+" : "500+"}</div>
          <div class="text-stone-500 text-xs tracking-widest uppercase">Casos Atendidos</div>
        </div>
        <div class="bg-stone-950/80 px-8 py-6">
          <div class="serif text-3xl font-bold gold mb-1">${d.rating ? d.rating.toFixed(1) + "★" : "4.9★"}</div>
          <div class="text-stone-500 text-xs tracking-widest uppercase">Avaliação Google</div>
        </div>
        <div class="bg-stone-950/80 px-8 py-6">
          <div class="serif text-3xl font-bold gold mb-1">24h</div>
          <div class="text-stone-500 text-xs tracking-widest uppercase">Resposta Garantida</div>
        </div>
      </div>
    </div>
  </section>

  <section id="areas" class="py-28 bg-[#0e0e10]">
    <div class="max-w-6xl mx-auto px-6">
      <div class="flex items-end justify-between mb-16 border-b border-stone-800 pb-6">
        <div>
          <span class="text-amber-600/70 text-xs tracking-[0.35em] uppercase block mb-3">Especialidades</span>
          <h2 class="serif text-4xl md:text-5xl font-semibold text-stone-100">Áreas de <span class="gold italic">Atuação</span></h2>
        </div>
        <a href="${wa}" target="_blank" class="hidden md:inline-flex items-center gap-2 text-amber-500 text-sm hover:text-amber-400 transition-colors">
          Consulta gratuita
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
        </a>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-800/20">${areaCards}</div>
    </div>
  </section>

  <section id="escritorio" class="py-28 bg-stone-950">
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
        <div class="lg:col-span-3">
          <span class="text-amber-600/70 text-xs tracking-[0.35em] uppercase block mb-4">O Escritório</span>
          <h2 class="serif text-4xl md:text-5xl font-semibold text-stone-100 mb-8 leading-tight">
            Comprometidos com<br /><span class="gold italic">seus direitos.</span>
          </h2>
          <div>${differentialItems}</div>
        </div>
        <div class="lg:col-span-2">
          <div class="aside-img rounded-xl overflow-hidden mb-5 h-40"></div>
          <div class="border border-stone-800 p-8 bg-stone-950/50">
            ${ratingLine}
            <blockquote class="text-stone-300 text-sm leading-relaxed italic border-l-2 border-amber-700/50 pl-4">
              "Atendimento impecável, condução do caso com total profissionalismo e transparência. Recomendo sem hesitar."
            </blockquote>
            <p class="text-stone-500 text-xs mt-4">— Cliente verificado</p>
            <div class="hero-line my-6"></div>
            <a href="${wa}" target="_blank" class="w-full inline-flex items-center justify-center gap-3 bg-amber-700 hover:bg-amber-600 text-white font-medium text-sm px-6 py-3.5 transition-all duration-200">
              ${esc(d.ctaText)}
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="contato" class="py-24 relative overflow-hidden bg-stone-950">
    <div class="absolute inset-0 bg-gradient-to-r from-stone-950 via-amber-950/10 to-stone-950"></div>
    <div class="relative z-10 max-w-3xl mx-auto px-6 text-center">
      <div class="hero-line mb-10 mx-auto max-w-xs"></div>
      <h2 class="serif text-4xl md:text-5xl font-bold text-stone-100 mb-4">
        Seu caso merece<br /><span class="gold italic">atenção especializada.</span>
      </h2>
      <p class="text-stone-400 text-base mb-10 font-light">Consulta inicial gratuita e sem compromisso. Atendemos presencialmente e à distância.</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="${wa}" target="_blank" class="inline-flex items-center justify-center gap-3 bg-green-700 hover:bg-green-600 text-white font-medium text-sm px-10 py-4 transition-all duration-200">
          ${waSvg()}
          Falar pelo WhatsApp
        </a>
        <a href="tel:${d.whatsapp}" class="inline-flex items-center justify-center gap-2 border border-stone-700 hover:border-amber-600/50 text-stone-300 hover:text-amber-300 text-sm px-10 py-4 transition-all duration-200">
          ${esc(d.phone)}
        </a>
      </div>
    </div>
  </section>

  <footer class="bg-stone-950 border-t border-stone-900 py-8">
    <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <p class="text-stone-300 font-medium text-sm">${esc(d.companyName)}</p>
        <p class="text-stone-600 text-xs mt-1">${esc(d.address)} — ${esc(d.city)}</p>
      </div>
      <div class="flex items-center gap-6 text-stone-600 text-xs">
        ${igLink}
        <span>${esc(d.phone)}</span>
      </div>
    </div>
  </footer>

</body>
</html>`;
}

// ── Automoveis ────────────────────────────────────────────────────────────────

function renderAutomoveis(d: TemplateData): string {
  const wa = waUrl(d.whatsapp, d.whatsappMessage);

  const logoBox = d.logoUrl
    ? `<img src="${esc(d.logoUrl)}" alt="${esc(d.companyName)}" class="w-8 h-8 object-cover" />`
    : `<div class="w-8 h-8 red-bg flex items-center justify-center font-black text-white text-sm">${initial(d.companyName)}</div>`;

  const serviceCards = d.services.slice(0, 4).map((s, i) => `
    <div class="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-red-600/40 transition-all duration-300 hover:-translate-y-1">
      <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div class="p-7">
        <span class="block text-red-600/40 font-mono text-xs tracking-[0.3em] mb-4">0${i + 1}</span>
        <div class="text-3xl mb-4">${esc(s.icon)}</div>
        <h3 class="text-white font-bold text-base mb-2 leading-tight">${esc(s.name)}</h3>
        <p class="text-zinc-400 text-sm leading-relaxed">${esc(s.description)}</p>
      </div>
    </div>`).join("\n");

  const differentialItems = d.differentials.slice(0, 5).map((diff) => `
    <div class="flex items-start gap-4 py-4 border-b border-zinc-800/60 last:border-0">
      <div class="w-5 h-5 bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"/></svg>
      </div>
      <span class="text-zinc-300 text-sm leading-relaxed">${esc(diff)}</span>
    </div>`).join("\n");

  const igLink = d.instagram
    ? `<a href="https://instagram.com/${esc(d.instagram.replace("@", ""))}" target="_blank" class="hover:text-red-500 transition-colors">${esc(d.instagram)}</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(d.companyName)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700;800;900&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Barlow', sans-serif; background: #0a0a0a; color: #e5e5e5; }
    .condensed { font-family: 'Barlow Condensed', sans-serif; }
    .hero-img {
      background-image: linear-gradient(to right, rgba(10,10,10,0.95) 35%, rgba(10,10,10,0.50) 100%),
        url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1600&q=85&fit=crop');
      background-size: cover; background-position: center;
    }
    .showroom-strip {
      background-image: linear-gradient(rgba(10,10,10,0.70), rgba(10,10,10,0.70)),
        url('https://images.unsplash.com/photo-1562141961-b04d5c48bd6c?w=1400&q=80&fit=crop');
      background-size: cover; background-position: center;
    }
    .interior-card {
      background-image: linear-gradient(to top, rgba(10,10,10,0.90), rgba(10,10,10,0.30)),
        url('https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=800&q=80&fit=crop');
      background-size: cover; background-position: center;
    }
    .red { color: #e30000; }
    .red-bg { background: #e30000; }
    .red-border { border-color: #e30000; }
    .scan-line { background: repeating-linear-gradient(90deg, rgba(227,0,0,0.06) 0px, rgba(227,0,0,0.06) 1px, transparent 1px, transparent 40px); }
    .wp-pulse { animation: wpp 2.5s ease-in-out infinite; }
    @keyframes wpp { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.3)} 60%{box-shadow:0 0 0 14px rgba(34,197,94,0)} }
  </style>
</head>
<body class="antialiased">

  <nav class="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-800">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        ${logoBox}
        <span class="condensed font-black text-white text-lg uppercase tracking-wide">${esc(d.companyName)}</span>
      </div>
      <div class="hidden md:flex items-center gap-8 text-zinc-400 text-sm font-medium uppercase tracking-widest">
        <a href="#servicos" class="hover:text-red-500 transition-colors">Serviços</a>
        <a href="#diferenciais" class="hover:text-red-500 transition-colors">Diferenciais</a>
        <a href="#contato" class="hover:text-red-500 transition-colors">Contato</a>
      </div>
      <a href="${wa}" target="_blank" class="wp-pulse inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-5 py-2.5 uppercase tracking-wider transition-all duration-200">
        ${waSvg("w-4 h-4 fill-white")}
        WhatsApp
      </a>
    </div>
  </nav>

  <section class="hero-img scan-line pt-16 min-h-screen flex items-center relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-1 red-bg opacity-90"></div>
    <div class="max-w-6xl mx-auto px-6 py-24 relative z-10 w-full">
      <div class="max-w-xl">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-10 h-px red-border border-t-2"></div>
          <span class="text-red-500 text-xs font-bold uppercase tracking-[0.4em]">${esc(d.city)} — Automóveis</span>
        </div>
        <h1 class="condensed font-black uppercase leading-none mb-6">
          <span class="block text-white text-6xl md:text-7xl lg:text-8xl">${esc(d.heroHeadline.split(" ").slice(0, 2).join(" "))}</span>
          <span class="block red text-5xl md:text-6xl lg:text-7xl">${esc(d.heroHeadline.split(" ").slice(2).join(" ") || d.heroHeadline)}</span>
        </h1>
        <p class="text-zinc-400 text-lg leading-relaxed mb-10 font-light max-w-md">${esc(d.heroSubtitle)}</p>
        <div class="flex flex-col sm:flex-row gap-4 mb-14">
          <a href="${wa}" target="_blank" class="wp-pulse inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wide text-sm px-8 py-4 transition-all duration-200 shadow-xl shadow-green-900/30">
            ${waSvg()}
            ${esc(d.ctaText)}
          </a>
          <a href="tel:${d.whatsapp}" class="inline-flex items-center justify-center gap-2 border border-zinc-700 hover:border-red-600/60 text-zinc-300 hover:text-red-400 font-medium text-sm px-8 py-4 transition-all duration-200">
            ${esc(d.phone)}
          </a>
        </div>
        <div class="grid grid-cols-3 gap-px bg-zinc-800/40 border border-zinc-800/40 max-w-sm">
          <div class="bg-black/60 px-5 py-4 text-center">
            <div class="condensed font-black text-2xl red">${d.reviewCount ? d.reviewCount + "+" : "200+"}</div>
            <div class="text-zinc-500 text-xs uppercase tracking-wider mt-0.5">Clientes</div>
          </div>
          <div class="bg-black/60 px-5 py-4 text-center">
            <div class="condensed font-black text-2xl red">${d.rating ? d.rating.toFixed(1) + "★" : "4.8★"}</div>
            <div class="text-zinc-500 text-xs uppercase tracking-wider mt-0.5">Google</div>
          </div>
          <div class="bg-black/60 px-5 py-4 text-center">
            <div class="condensed font-black text-2xl red">100%</div>
            <div class="text-zinc-500 text-xs uppercase tracking-wider mt-0.5">Garantia</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="red-bg py-5">
    <div class="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <span class="condensed font-black text-white text-2xl uppercase">${esc(d.heroSubtitle.split(".")[0] || d.companyName)}</span>
      <a href="${wa}" target="_blank" class="inline-flex items-center gap-2 bg-black/30 hover:bg-black/50 text-white font-bold text-xs px-5 py-2.5 uppercase tracking-widest border border-white/20 transition-all">
        Saiba mais →
      </a>
    </div>
  </div>

  <section id="servicos" class="py-24 bg-zinc-950">
    <div class="max-w-6xl mx-auto px-6">
      <div class="flex items-end justify-between mb-12 pb-6 border-b border-zinc-800">
        <div>
          <span class="red text-xs font-bold uppercase tracking-[0.35em] block mb-2">O que oferecemos</span>
          <h2 class="condensed text-4xl md:text-5xl font-black uppercase text-white">Serviços & <span class="red">Diferenciais</span></h2>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800/30">${serviceCards}</div>
    </div>
  </section>

  <div class="showroom-strip h-52 w-full flex items-center justify-center relative">
    <div class="text-center z-10">
      <p class="condensed font-black text-white text-4xl md:text-5xl uppercase tracking-widest drop-shadow-2xl">${esc(d.companyName)}</p>
      <p class="text-white/60 text-sm mt-2 uppercase tracking-widest">${esc(d.address)} — ${esc(d.city)}</p>
    </div>
  </div>

  <section id="diferenciais" class="py-24 bg-zinc-900">
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div>
          <span class="red text-xs font-bold uppercase tracking-[0.35em] block mb-4">Por que nos escolher</span>
          <h2 class="condensed text-4xl md:text-5xl font-black uppercase text-white mb-8 leading-tight">
            Transparência e<br /><span class="red">confiança</span> em cada negociação.
          </h2>
          <div>${differentialItems}</div>
        </div>
        <div id="contato" class="bg-zinc-950 border border-zinc-800 p-8 relative">
          <div class="absolute top-0 left-0 w-1 h-full red-bg"></div>
          <h3 class="condensed text-2xl font-black uppercase text-white mb-2">Fale com um Consultor</h3>
          <p class="text-zinc-400 text-sm mb-6">Atendimento personalizado. Sem pressão, sem enrolação.</p>
          <div class="space-y-3 mb-7">
            <div class="flex items-center gap-3 text-zinc-300 text-sm"><span class="red text-base">📍</span> ${esc(d.address)} — ${esc(d.city)}</div>
            <div class="flex items-center gap-3 text-zinc-300 text-sm"><span class="red text-base">📞</span> ${esc(d.phone)}</div>
            ${d.instagram ? `<div class="flex items-center gap-3 text-zinc-300 text-sm"><span class="red text-base">📸</span> ${esc(d.instagram)}</div>` : ""}
            <div class="flex items-center gap-3 text-zinc-300 text-sm"><span class="red text-base">🕐</span> Seg–Sex 8h–18h · Sáb 8h–14h</div>
          </div>
          <a href="${wa}" target="_blank" class="w-full inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wide text-sm px-6 py-4 transition-all duration-200">
            ${waSvg()}
            ${esc(d.ctaText)}
          </a>
        </div>
      </div>
    </div>
  </section>

  <section class="red-bg py-20 relative overflow-hidden">
    <div class="absolute inset-0 scan-line opacity-30"></div>
    <div class="relative z-10 max-w-4xl mx-auto px-6 text-center">
      <p class="text-white/50 font-bold uppercase tracking-[0.4em] text-xs mb-4">Próximo passo</p>
      <h2 class="condensed font-black text-white uppercase text-5xl md:text-6xl leading-tight mb-4">${esc(d.heroHeadline)}</h2>
      <p class="text-white/70 text-base mb-10 max-w-md mx-auto font-light">${esc(d.heroSubtitle)}</p>
      <a href="${wa}" target="_blank" class="inline-flex items-center justify-center gap-3 bg-white text-red-600 font-black uppercase tracking-wide text-sm px-10 py-4 hover:bg-zinc-100 transition-all duration-200 shadow-2xl">
        ${waSvg("w-5 h-5 fill-green-600")}
        ${esc(d.ctaText)}
      </a>
    </div>
  </section>

  <footer class="bg-black border-t border-zinc-900 py-8">
    <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <p class="condensed font-black text-white uppercase tracking-wide">${esc(d.companyName)}</p>
        <p class="text-zinc-600 text-xs mt-1">${esc(d.address)} — ${esc(d.city)}</p>
      </div>
      <div class="flex items-center gap-6 text-zinc-600 text-xs">
        ${igLink}
        <span>${esc(d.phone)}</span>
      </div>
    </div>
  </footer>

</body>
</html>`;
}

// ── Comercio ──────────────────────────────────────────────────────────────────

function renderComercio(d: TemplateData): string {
  const wa = waUrl(d.whatsapp, d.whatsappMessage);

  const logoBox = d.logoUrl
    ? `<img src="${esc(d.logoUrl)}" alt="${esc(d.companyName)}" class="w-8 h-8 object-cover" />`
    : `<div class="w-8 h-8 yellow-bg flex items-center justify-center font-black text-black text-sm">${initial(d.companyName)}</div>`;

  const serviceCards = d.services.slice(0, 4).map((s, i) => `
    <div class="group relative bg-zinc-900 border border-zinc-800 hover:border-yellow-500/40 p-7 transition-all hover:-translate-y-1">
      <div class="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors rounded-bl-3xl"></div>
      <span class="block text-yellow-600/40 font-mono text-xs tracking-[0.3em] mb-4">0${i + 1}</span>
      <div class="text-3xl mb-4 opacity-80">${esc(s.icon)}</div>
      <h3 class="text-zinc-100 font-bold text-base mb-2">${esc(s.name)}</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">${esc(s.description)}</p>
    </div>`).join("\n");

  const differentialItems = d.differentials.slice(0, 4).map((diff) => `
    <div class="flex items-start gap-4 py-4 border-b border-zinc-800/60 last:border-0">
      <div class="w-6 h-6 yellow-bg flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"/></svg>
      </div>
      <span class="text-zinc-300 text-sm leading-relaxed">${esc(diff)}</span>
    </div>`).join("\n");

  const igLink = d.instagram
    ? `<span>${esc(d.instagram)}</span>` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(d.companyName)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,800&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Barlow', sans-serif; background: #0f0f0f; color: #e5e5e5; }
    .condensed { font-family: 'Barlow Condensed', sans-serif; }
    .yellow { color: #f5b800; }
    .yellow-bg { background: #f5b800; }
    .hero-grid { background-image: linear-gradient(rgba(245,184,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,184,0,0.03) 1px, transparent 1px); background-size: 48px 48px; }
    .hero-bg-img {
      background-image: linear-gradient(to right, rgba(15,15,15,0.97) 45%, rgba(15,15,15,0.55) 100%),
        url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&q=80&fit=crop');
      background-size: cover; background-position: center right;
    }
    .construcao-strip {
      background-image: linear-gradient(rgba(15,15,15,0.75), rgba(15,15,15,0.75)),
        url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80&fit=crop');
      background-size: cover; background-position: center;
    }
    .stripe-accent { background: repeating-linear-gradient(45deg, #f5b800, #f5b800 4px, transparent 4px, transparent 16px); }
    .promo-card { background: linear-gradient(135deg, #f5b800 0%, #d4920a 100%); }
    .wp-bounce { animation: bounce 2s ease-in-out infinite; }
    @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  </style>
</head>
<body class="antialiased">

  <nav class="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-800">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-2">
        ${logoBox}
        <span class="font-bold text-white text-sm uppercase tracking-wide">${esc(d.companyName)}</span>
      </div>
      <div class="hidden md:flex items-center gap-8 text-zinc-400 text-sm font-medium uppercase tracking-wide">
        <a href="#produtos" class="hover:text-yellow-400 transition-colors">Produtos</a>
        <a href="#diferenciais" class="hover:text-yellow-400 transition-colors">Diferenciais</a>
        <a href="#contato" class="hover:text-yellow-400 transition-colors">Contato</a>
      </div>
      <a href="${wa}" target="_blank" class="inline-flex items-center gap-2 yellow-bg hover:bg-yellow-400 text-black font-bold text-xs px-5 py-2.5 uppercase tracking-wider transition-all">
        WhatsApp
      </a>
    </div>
  </nav>

  <section class="pt-16 hero-bg-img hero-grid min-h-screen flex items-center relative overflow-hidden bg-zinc-950">
    <div class="absolute top-0 left-0 w-full h-1 yellow-bg opacity-80"></div>
    <div class="max-w-6xl mx-auto px-6 py-24 relative z-10 w-full">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div class="lg:col-span-8">
          <div class="flex items-center gap-3 mb-8">
            <div class="stripe-accent w-12 h-5 opacity-60"></div>
            <span class="text-yellow-500 text-xs font-bold uppercase tracking-[0.4em]">${esc(d.city)} — Qualidade Garantida</span>
          </div>
          <h1 class="condensed text-6xl md:text-7xl lg:text-8xl font-black uppercase leading-none mb-6">
            <span class="block text-white">${esc(d.heroHeadline.split(" ").slice(0, 2).join(" "))}</span>
            <span class="block yellow">${esc(d.heroHeadline.split(" ").slice(2).join(" ") || d.heroHeadline)}</span>
          </h1>
          <p class="text-zinc-400 text-lg leading-relaxed mb-10 max-w-xl font-light">${esc(d.heroSubtitle)}</p>
          <div class="flex flex-col sm:flex-row gap-4 mb-12">
            <a href="${wa}" target="_blank" class="wp-bounce inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wide text-sm px-8 py-4 transition-all shadow-xl shadow-green-900/40">
              ${waSvg()}
              ${esc(d.ctaText)}
            </a>
            <a href="tel:${d.whatsapp}" class="inline-flex items-center justify-center gap-2 border border-zinc-700 hover:border-yellow-500/60 text-zinc-300 hover:text-yellow-300 font-medium text-sm px-8 py-4 transition-all">
              ${esc(d.phone)}
            </a>
          </div>
        </div>
        <div class="lg:col-span-4">
          <div class="promo-card p-7 text-black relative overflow-hidden">
            <div class="absolute -top-6 -right-6 w-24 h-24 bg-black/10 rounded-full"></div>
            <p class="font-black uppercase text-xs tracking-[0.3em] mb-3 opacity-70">Atendimento</p>
            <p class="condensed font-black text-4xl leading-tight mb-3">${esc(d.ctaText.toUpperCase())}</p>
            <p class="text-sm font-medium opacity-80 mb-5">${esc(d.city)} · ${d.rating ? d.rating.toFixed(1) + "★ no Google" : "Qualidade garantida"}</p>
            <a href="${wa}" target="_blank" class="inline-flex items-center gap-2 bg-black text-yellow-400 font-bold text-xs px-5 py-2.5 uppercase tracking-wider hover:bg-zinc-900 transition-colors">
              Falar agora →
            </a>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-px bg-zinc-800">
            <div class="bg-zinc-900 px-5 py-4">
              <div class="yellow font-black text-2xl condensed">${d.reviewCount ? d.reviewCount + "+" : "100+"}</div>
              <div class="text-zinc-500 text-xs uppercase tracking-wider mt-1">Clientes</div>
            </div>
            <div class="bg-zinc-900 px-5 py-4">
              <div class="yellow font-black text-2xl condensed">${d.rating ? d.rating.toFixed(1) + "★" : "4.8★"}</div>
              <div class="text-zinc-500 text-xs uppercase tracking-wider mt-1">Google</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="produtos" class="py-24 bg-zinc-900">
    <div class="max-w-6xl mx-auto px-6">
      <div class="flex items-end justify-between mb-12 pb-6 border-b border-zinc-800">
        <div>
          <span class="yellow text-xs font-bold uppercase tracking-[0.35em] block mb-2">Catálogo</span>
          <h2 class="condensed text-4xl md:text-5xl font-black uppercase text-white">Produtos & <span class="yellow">Serviços</span></h2>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800/50">${serviceCards}</div>
    </div>
  </section>

  <div class="construcao-strip h-48 w-full flex items-center justify-center">
    <span class="text-white/20 condensed font-black text-5xl uppercase tracking-widest select-none">${esc(d.companyName)}</span>
  </div>

  <section id="diferenciais" class="py-24 bg-zinc-950">
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div>
          <span class="yellow text-xs font-bold uppercase tracking-[0.35em] block mb-4">Por que nos escolher</span>
          <h2 class="condensed text-4xl md:text-5xl font-black uppercase text-white mb-8 leading-tight">
            Compromisso com<br /><span class="yellow">qualidade real</span>
          </h2>
          <div>${differentialItems}</div>
        </div>
        <div id="contato" class="relative">
          <div class="bg-zinc-900 border border-zinc-800 p-8">
            <div class="absolute top-0 left-0 w-1 h-full yellow-bg"></div>
            <h3 class="condensed text-2xl font-black uppercase text-white mb-2">Entre em Contato</h3>
            <p class="text-zinc-400 text-sm mb-6">Atendimento rápido pelo WhatsApp. Sem compromisso.</p>
            <div class="space-y-3 mb-8">
              <div class="flex items-center gap-3 text-zinc-300 text-sm"><span class="yellow text-lg">📍</span> ${esc(d.address)} — ${esc(d.city)}</div>
              <div class="flex items-center gap-3 text-zinc-300 text-sm"><span class="yellow text-lg">📞</span> ${esc(d.phone)}</div>
              <div class="flex items-center gap-3 text-zinc-300 text-sm"><span class="yellow text-lg">🕐</span> Seg–Sex 8h–18h · Sáb 8h–13h</div>
            </div>
            <a href="${wa}" target="_blank" class="w-full inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wide text-sm px-6 py-4 transition-all">
              ${waSvg()}
              ${esc(d.ctaText)}
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="yellow-bg py-20">
    <div class="max-w-4xl mx-auto px-6 text-center">
      <h2 class="condensed text-5xl md:text-6xl font-black uppercase text-black leading-tight mb-4">${esc(d.companyName)}</h2>
      <p class="text-black/60 text-base mb-8 font-medium">${esc(d.address)} — ${esc(d.city)}</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="${wa}" target="_blank" class="inline-flex items-center justify-center gap-3 bg-black text-yellow-400 font-bold uppercase tracking-wide text-sm px-10 py-4 hover:bg-zinc-900 transition-all shadow-xl">
          ${waSvg("w-5 h-5 fill-green-400")}
          ${esc(d.ctaText)}
        </a>
        <a href="tel:${d.whatsapp}" class="inline-flex items-center justify-center gap-2 border-2 border-black text-black font-bold uppercase tracking-wide text-sm px-10 py-4 hover:bg-black/10 transition-all">
          Ligar Agora
        </a>
      </div>
    </div>
  </section>

  <footer class="bg-black border-t border-zinc-900 py-8">
    <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <p class="text-white font-bold uppercase tracking-wide text-sm">${esc(d.companyName)}</p>
        <p class="text-zinc-600 text-xs mt-1">${esc(d.address)} — ${esc(d.city)}</p>
      </div>
      <div class="flex items-center gap-6 text-zinc-600 text-xs">
        ${igLink}
        <span>${esc(d.phone)}</span>
      </div>
    </div>
  </footer>

</body>
</html>`;
}

// ── Imoveis ───────────────────────────────────────────────────────────────────

function renderImoveis(d: TemplateData): string {
  const wa = waUrl(d.whatsapp, d.whatsappMessage);

  const serviceCards = d.services.slice(0, 4).map((s, i) => `
    <div class="svc-card">
      <div class="svc-num">0${i + 1}</div>
      <div class="svc-icon">${esc(s.icon)}</div>
      <h3 class="svc-title">${esc(s.name)}</h3>
      <p class="svc-desc">${esc(s.description)}</p>
    </div>`).join("\n");

  const differentialItems = d.differentials.slice(0, 5).map((diff) => `
    <div class="diff-item">
      <div class="diff-check">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L4.5 8.5L10 3" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="diff-text">${esc(diff)}</span>
    </div>`).join("\n");

  const igLink = d.instagram
    ? `<span>${esc(d.instagram)}</span>` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(d.companyName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --ink: #0a0d0e; --ink-2: #111618; --teal: #0a7c57; --teal-light: #13a874; --gold: #c8955f; --sand: #f5f0e8; --text: #1a2027; --muted: #6b7580; --border: rgba(10,124,87,0.15); }
    html { scroll-behavior: smooth; }
    body { font-family: 'DM Sans', system-ui, sans-serif; color: var(--text); background: var(--sand); }
    h1, h2, h3, .serif { font-family: 'Playfair Display', Georgia, serif; }
    a { text-decoration: none; color: inherit; }
    img { display: block; max-width: 100%; }
    .nav { position: sticky; top: 0; z-index: 100; background: rgba(10,13,14,0.92); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(200,149,95,0.15); }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; height: 68px; }
    .nav-brand { display: flex; align-items: center; gap: 12px; }
    .nav-name { font-family: 'Playfair Display', serif; font-size: 16px; color: #fff; font-weight: 700; }
    .nav-sub { font-size: 10px; color: var(--gold); font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 1px; }
    .nav-cta { display: inline-flex; align-items: center; gap: 8px; background: var(--teal); color: #fff; font-weight: 600; font-size: 13px; padding: 10px 22px; border-radius: 6px; transition: background 0.2s; }
    .nav-cta:hover { background: var(--teal-light); }
    .hero { position: relative; min-height: 100vh; display: flex; align-items: center; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; background-image: url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop'); background-size: cover; background-position: center 30%; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(105deg, rgba(10,13,14,0.88) 0%, rgba(10,13,14,0.72) 45%, rgba(10,13,14,0.35) 100%); }
    .hero-content { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 120px 2rem 80px; }
    .hero-eyebrow { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(200,149,95,0.35); border-radius: 2px; padding: 6px 14px; margin-bottom: 28px; color: var(--gold); font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; }
    .hero-title { font-size: clamp(3rem, 7vw, 5.5rem); line-height: 1.05; color: #fff; max-width: 680px; margin-bottom: 24px; }
    .hero-title em { color: var(--gold); font-style: italic; }
    .hero-sub { font-size: 18px; color: rgba(255,255,255,0.6); max-width: 480px; line-height: 1.7; margin-bottom: 44px; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
    .btn-primary { display: inline-flex; align-items: center; gap: 10px; background: var(--teal); color: #fff; font-weight: 700; font-size: 15px; padding: 16px 32px; border-radius: 6px; transition: all 0.2s; box-shadow: 0 8px 28px rgba(10,124,87,0.4); }
    .btn-primary:hover { background: var(--teal-light); transform: translateY(-1px); }
    .btn-ghost { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.8); font-weight: 500; font-size: 14px; padding: 14px 26px; border-radius: 6px; transition: all 0.2s; }
    .btn-ghost:hover { border-color: rgba(255,255,255,0.5); color: #fff; }
    .hero-rating { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.08); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 12px 18px; margin-top: 50px; width: fit-content; }
    .hero-stars { color: #f5c542; font-size: 14px; }
    .hero-rating-text { font-size: 12px; color: rgba(255,255,255,0.6); }
    .hero-rating-text strong { color: #fff; font-size: 15px; }
    .prop-strip { position: relative; height: 360px; overflow: hidden; }
    .prop-strip-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(10,13,14,0.8) 0%, rgba(10,13,14,0.3) 50%, rgba(10,13,14,0.7) 100%); display: flex; align-items: center; padding: 0 2rem; }
    .prop-strip-inner { max-width: 1200px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 32px; }
    .prop-strip-headline { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 4vw, 2.8rem); color: #fff; max-width: 440px; line-height: 1.2; }
    .prop-strip-headline span { color: var(--gold); }
    .prop-stats { display: flex; gap: 40px; }
    .prop-stat-num { font-family: 'Playfair Display', serif; font-size: 3rem; font-weight: 800; color: #fff; line-height: 1; }
    .prop-stat-label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }
    .section { padding: 96px 2rem; }
    .section-inner { max-width: 1200px; margin: 0 auto; }
    .section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; }
    .section-title { font-size: clamp(2rem, 4vw, 2.8rem); color: var(--text); margin-bottom: 48px; line-height: 1.2; }
    .svc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 2px; }
    .svc-card { background: #fff; padding: 36px 28px; position: relative; overflow: hidden; transition: box-shadow 0.2s; }
    .svc-card:hover { box-shadow: 0 12px 40px rgba(10,124,87,0.1); }
    .svc-card::before { content: ''; position: absolute; inset: 0 0 0 0; border-left: 3px solid transparent; transition: border-color 0.2s; }
    .svc-card:hover::before { border-color: var(--teal); }
    .svc-num { font-size: 10px; font-weight: 700; color: var(--gold); letter-spacing: 0.2em; margin-bottom: 20px; }
    .svc-icon { font-size: 2rem; margin-bottom: 16px; }
    .svc-title { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--text); margin-bottom: 10px; }
    .svc-desc { font-size: 14px; color: var(--muted); line-height: 1.65; }
    .diff-section { background: var(--ink); padding: 96px 2rem; position: relative; overflow: hidden; }
    .diff-section::before { content: ''; position: absolute; inset: 0; background-image: url('https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80&auto=format&fit=crop'); background-size: cover; background-position: center; opacity: 0.12; }
    .diff-inner { max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; }
    .diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
    .diff-headline { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 4vw, 3rem); color: #fff; line-height: 1.2; margin-bottom: 12px; }
    .diff-headline em { color: var(--gold); font-style: italic; }
    .diff-sub { font-size: 16px; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 40px; }
    .diff-list { display: flex; flex-direction: column; gap: 16px; }
    .diff-item { display: flex; align-items: flex-start; gap: 14px; }
    .diff-check { width: 22px; height: 22px; border-radius: 50%; background: var(--teal); flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; }
    .diff-text { font-size: 15px; color: rgba(255,255,255,0.8); line-height: 1.5; }
    .diff-cta-wrap { display: flex; flex-direction: column; gap: 20px; }
    .diff-city-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(200,149,95,0.2); border-radius: 10px; padding: 24px; }
    .diff-city-label { font-size: 11px; color: var(--gold); font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px; }
    .diff-city-name { font-family: 'Playfair Display', serif; font-size: 2rem; color: #fff; }
    .diff-city-sub { font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 4px; }
    .diff-cta { display: flex; flex-direction: column; gap: 14px; }
    .stats-section { background: var(--teal); padding: 64px 2rem; }
    .stats-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; text-align: center; }
    .stat-num { font-family: 'Playfair Display', serif; font-size: 3.5rem; font-weight: 800; color: #fff; line-height: 1; }
    .stat-label { font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 8px; }
    .cta-section { background: var(--sand); padding: 96px 2rem; }
    .cta-inner { max-width: 680px; margin: 0 auto; text-align: center; }
    .cta-title { font-size: clamp(2rem, 4.5vw, 3.2rem); color: var(--text); margin-bottom: 16px; line-height: 1.2; }
    .cta-title em { color: var(--teal); font-style: italic; }
    .cta-sub { font-size: 17px; color: var(--muted); line-height: 1.65; margin-bottom: 40px; }
    .cta-btn { display: inline-flex; align-items: center; gap: 12px; background: var(--ink); color: #fff; font-weight: 700; font-size: 16px; padding: 20px 44px; border-radius: 6px; transition: all 0.2s; box-shadow: 0 12px 40px rgba(10,13,14,0.25); }
    .cta-btn:hover { background: var(--teal); box-shadow: 0 12px 40px rgba(10,124,87,0.35); transform: translateY(-2px); }
    .cta-note { font-size: 12px; color: var(--muted); margin-top: 16px; }
    footer { background: var(--ink); padding: 36px 2rem; }
    .footer-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .footer-brand { font-family: 'Playfair Display', serif; font-size: 18px; color: #fff; }
    .footer-info { font-size: 13px; color: rgba(255,255,255,0.35); }
    @media (max-width: 768px) { .diff-grid { grid-template-columns: 1fr; gap: 40px; } .stats-inner { grid-template-columns: repeat(2, 1fr); } .svc-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>

  <nav class="nav">
    <div class="nav-inner">
      <div class="nav-brand">
        <div>
          <div class="nav-name">${esc(d.companyName)}</div>
          <div class="nav-sub">Imóveis · ${esc(d.city)}</div>
        </div>
      </div>
      <div class="nav-phone" style="display:flex;align-items:center;gap:10px">
        <div class="nav-tel" style="font-size:12px;color:rgba(255,255,255,0.5)">Fale com um corretor<br><strong style="color:rgba(255,255,255,0.85);font-weight:500">${esc(d.phone)}</strong></div>
        <a href="${wa}" target="_blank" class="nav-cta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">${WA_PATH}</svg>
          WhatsApp
        </a>
      </div>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-bg"></div>
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <div class="hero-eyebrow">🏠 ${esc(d.city)} — Imóveis Exclusivos</div>
      <h1 class="hero-title serif">${esc(d.heroHeadline)}</h1>
      <p class="hero-sub">${esc(d.heroSubtitle)}</p>
      <div class="hero-actions">
        <a href="${wa}" target="_blank" class="btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">${WA_PATH}</svg>
          ${esc(d.ctaText)}
        </a>
        <a href="tel:${d.whatsapp}" class="btn-ghost">${esc(d.phone)}</a>
      </div>
      ${d.rating && d.reviewCount ? `<div class="hero-rating">
        <span class="hero-stars">${starsFull(d.rating)}</span>
        <div class="hero-rating-text"><strong>${d.rating.toFixed(1)}</strong> — ${d.reviewCount} avaliações no Google</div>
      </div>` : ""}
    </div>
  </section>

  <div class="prop-strip">
    <div style="position:absolute;inset:0;background-image:url('https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1600&q=85&auto=format&fit=crop');background-size:cover;background-position:center"></div>
    <div class="prop-strip-overlay">
      <div class="prop-strip-inner">
        <h2 class="prop-strip-headline serif">Imóveis que transformam vidas em <span>${esc(d.city)}</span></h2>
        <div class="prop-stats">
          <div><div class="prop-stat-num">${d.reviewCount ? d.reviewCount + "+" : "100+"}</div><div class="prop-stat-label">Clientes atendidos</div></div>
          <div><div class="prop-stat-num">${d.rating ? d.rating.toFixed(1) : "4.8"}</div><div class="prop-stat-label">Nota no Google</div></div>
          <div><div class="prop-stat-num">10+</div><div class="prop-stat-label">Anos no mercado</div></div>
        </div>
      </div>
    </div>
  </div>

  <section class="section" style="background:#fff">
    <div class="section-inner">
      <div class="section-label">Como trabalhamos</div>
      <h2 class="section-title serif">Nossos serviços imobiliários</h2>
      <div class="svc-grid">${serviceCards}</div>
    </div>
  </section>

  <section class="diff-section">
    <div class="diff-inner">
      <div class="diff-grid">
        <div>
          <h2 class="diff-headline serif">Por que escolher a <em>${esc(d.companyName)}?</em></h2>
          <p class="diff-sub">${esc(d.heroSubtitle)}</p>
          <div class="diff-list">${differentialItems}</div>
        </div>
        <div class="diff-cta-wrap">
          <div class="diff-city-card">
            <div class="diff-city-label">Atuação principal</div>
            <div class="diff-city-name">${esc(d.city)}</div>
            <div class="diff-city-sub">${esc(d.address)}</div>
          </div>
          <div class="diff-cta">
            <a href="${wa}" target="_blank" class="btn-primary" style="justify-content:center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">${WA_PATH}</svg>
              ${esc(d.ctaText)}
            </a>
            <a href="tel:${d.whatsapp}" class="btn-ghost" style="justify-content:center">${esc(d.phone)}</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="stats-section">
    <div class="stats-inner">
      <div><div class="stat-num">${d.reviewCount ? d.reviewCount + "+" : "100+"}</div><div class="stat-label">Clientes atendidos</div></div>
      <div><div class="stat-num">${d.rating ? d.rating.toFixed(1) : "4.8"}</div><div class="stat-label">Avaliação Google</div></div>
      <div><div class="stat-num">98%</div><div class="stat-label">Satisfação</div></div>
      <div><div class="stat-num">10+</div><div class="stat-label">Anos de mercado</div></div>
    </div>
  </section>

  <section class="cta-section">
    <div class="cta-inner">
      <h2 class="cta-title serif">${esc(d.heroHeadline.split(",")[0] ?? d.heroHeadline)}, <em>o imóvel certo está aqui.</em></h2>
      <p class="cta-sub">${esc(d.heroSubtitle)}</p>
      <a href="${wa}" target="_blank" class="cta-btn">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">${WA_PATH}</svg>
        ${esc(d.ctaText)}
      </a>
      <p class="cta-note">Atendimento imediato · Sem compromisso · ${esc(d.city)}</p>
    </div>
  </section>

  <footer>
    <div class="footer-inner">
      <div>
        <div class="footer-brand">${esc(d.companyName)}</div>
        <div class="footer-info">${esc(d.address)} — ${esc(d.city)}</div>
      </div>
      <div style="display:flex;gap:24px;font-size:13px;color:rgba(255,255,255,0.35)">
        ${igLink}
        <span>${esc(d.phone)}</span>
      </div>
    </div>
  </footer>

</body>
</html>`;
}

// ── Router ────────────────────────────────────────────────────────────────────

const RENDER_MAP: Partial<Record<Niche, (d: TemplateData) => string>> = {
  clinica:    renderClinica,
  advogado:   renderAdvogado,
  automoveis: renderAutomoveis,
  comercio:   renderComercio,
  imoveis:    renderImoveis,
};

export function renderDemoTemplate(data: TemplateData): string {
  const renderer = RENDER_MAP[data.niche] ?? renderClinica;
  return renderer(data);
}

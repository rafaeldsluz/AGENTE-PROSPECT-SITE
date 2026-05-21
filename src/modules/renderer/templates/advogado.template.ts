import type { TemplateData } from "../../../types/template.types.js";

export function renderAdvogadoTemplate(data: TemplateData): string {
  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(data.whatsappMessage)}`;

  const services = data.services
    .map(
      (s, i) => `
      <div class="service-card group relative overflow-hidden">
        <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div class="relative p-8 border border-stone-200/60 hover:border-amber-400/40 transition-all duration-400 bg-white/5 backdrop-blur-sm">
          <span class="block text-amber-500/60 font-mono text-xs tracking-[0.3em] mb-5">0${i + 1}</span>
          <div class="text-2xl mb-4 opacity-80">${s.icon}</div>
          <h3 class="text-stone-100 font-semibold text-lg mb-3 leading-tight">${s.name}</h3>
          <p class="text-stone-400 text-sm leading-relaxed">${s.description}</p>
          <div class="mt-6 flex items-center gap-2 text-amber-500 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>Saiba mais</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>`
    )
    .join("");

  const differentials = data.differentials
    .map(
      (d) => `
      <div class="flex items-start gap-4 py-4 border-b border-stone-800/50 last:border-0">
        <div class="w-6 h-6 rounded-full border border-amber-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"/></svg>
        </div>
        <span class="text-stone-300 text-sm leading-relaxed">${d}</span>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.companyName} — Advocacia &amp; Consultoria Jurídica</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --gold: #b8973d;
      --gold-light: #d4af5a;
      --gold-dim: rgba(184,151,61,0.15);
      --ink: #0c0c0e;
      --stone: #1a1a1f;
    }
    body { font-family: 'Inter', sans-serif; background: var(--ink); color: #e5e1d8; }
    .serif { font-family: 'Cormorant Garamond', serif; }
    .gold { color: var(--gold-light); }
    .gold-border { border-color: var(--gold); }
    .gold-bg { background: var(--gold); }
    .hero-img {
      background-image:
        linear-gradient(to right, rgba(12,12,14,0.97) 40%, rgba(12,12,14,0.60) 100%),
        url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1400&q=80&fit=crop');
      background-size: cover;
      background-position: center right;
    }
    .aside-img {
      background-image:
        linear-gradient(to bottom, rgba(26,26,31,0.70), rgba(12,12,14,0.95)),
        url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80&fit=crop');
      background-size: cover;
      background-position: center;
    }
    .noise-bg {
      background-color: var(--ink);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    }
    .hero-line { height: 1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); }
    .hero-marquee { animation: marquee 30s linear infinite; white-space: nowrap; }
    @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .wp-float { animation: float 3s ease-in-out infinite; }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .text-balance { text-wrap: balance; }
  </style>
</head>
<body class="noise-bg antialiased">

  <!-- NAV -->
  <nav class="fixed top-0 left-0 right-0 z-50 border-b border-stone-800/50 backdrop-blur-xl bg-black/60">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        ${data.logoUrl
          ? `<img src="${data.logoUrl}" alt="${data.companyName}" class="h-9 w-auto object-contain opacity-90" />`
          : `<span class="serif text-xl font-semibold text-amber-300">${data.companyName}</span>`
        }
      </div>
      <div class="hidden md:flex items-center gap-8 text-stone-400 text-sm">
        <a href="#areas" class="hover:text-amber-400 transition-colors">Áreas de Atuação</a>
        <a href="#escritorio" class="hover:text-amber-400 transition-colors">O Escritório</a>
        <a href="#contato" class="hover:text-amber-400 transition-colors">Contato</a>
      </div>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-2 border border-amber-600/50 hover:border-amber-400 text-amber-400 hover:text-amber-300 text-xs font-medium tracking-widest uppercase px-5 py-2.5 transition-all duration-200">
        Consulta Gratuita
      </a>
    </div>
  </nav>

  <!-- MARQUEE -->
  <div class="pt-16 border-b border-stone-800/30 bg-stone-950/80 overflow-hidden py-3">
    <div class="hero-marquee inline-flex gap-16 text-stone-600 text-xs tracking-[0.3em] uppercase">
      ${Array(4).fill(`<span>Advocacia</span><span class="text-amber-700">·</span><span>Consultoria</span><span class="text-amber-700">·</span><span>Assessoria</span><span class="text-amber-700">·</span><span>Contratos</span><span class="text-amber-700">·</span><span>Litígios</span><span class="text-amber-700">·</span>`).join("")}
    </div>
  </div>

  <!-- HERO -->
  <section class="hero-img min-h-[90vh] flex flex-col justify-center relative overflow-hidden">
    <div class="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full bg-amber-900/5 blur-[120px]"></div>
    <div class="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-amber-800/5 blur-[80px]"></div>

    <div class="relative z-10 max-w-6xl mx-auto px-6 py-32">
      <div class="max-w-3xl">
        <div class="flex items-center gap-3 mb-10">
          <div class="w-8 h-px gold-border border-t"></div>
          <span class="text-amber-500/70 text-xs tracking-[0.35em] uppercase font-medium">${data.city} &nbsp;·&nbsp; Advocacia</span>
        </div>

        <h1 class="serif text-6xl md:text-7xl lg:text-8xl font-bold leading-none mb-8 text-balance">
          <span class="block text-stone-100">${data.heroHeadline.split(" ").slice(0, Math.ceil(data.heroHeadline.split(" ").length / 2)).join(" ")}</span>
          <span class="block gold italic">${data.heroHeadline.split(" ").slice(Math.ceil(data.heroHeadline.split(" ").length / 2)).join(" ")}</span>
        </h1>

        <div class="hero-line mb-8 max-w-xs"></div>

        <p class="text-stone-400 text-lg leading-relaxed mb-12 max-w-xl font-light">
          ${data.heroSubtitle}
        </p>

        <div class="flex flex-col sm:flex-row gap-4">
          <a href="${whatsappUrl}" target="_blank"
             class="wp-float inline-flex items-center gap-3 bg-green-700 hover:bg-green-600 text-white font-medium text-sm px-8 py-4 transition-all duration-200">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
            Falar com Advogado
          </a>
          <a href="tel:${data.phone.replace(/\D/g, "")}"
             class="inline-flex items-center gap-3 border border-stone-700 hover:border-amber-600/50 text-stone-300 hover:text-amber-300 font-light text-sm px-8 py-4 transition-all duration-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>
            ${data.phone}
          </a>
        </div>
      </div>

      <!-- STATS STRIP -->
      <div class="mt-24 grid grid-cols-3 gap-px bg-stone-800/30 border border-stone-800/30">
        <div class="bg-stone-950/80 px-8 py-6">
          <div class="serif text-3xl font-bold gold mb-1">${data.reviewCount ? `${Math.floor((data.reviewCount as number) / 10) * 10}+` : "100+"}</div>
          <div class="text-stone-500 text-xs tracking-widest uppercase">Casos Resolvidos</div>
        </div>
        <div class="bg-stone-950/80 px-8 py-6">
          <div class="serif text-3xl font-bold gold mb-1">${data.rating ? `${data.rating.toFixed(1)}★` : "5.0★"}</div>
          <div class="text-stone-500 text-xs tracking-widest uppercase">Avaliação Google</div>
        </div>
        <div class="bg-stone-950/80 px-8 py-6">
          <div class="serif text-3xl font-bold gold mb-1">24h</div>
          <div class="text-stone-500 text-xs tracking-widest uppercase">Resposta Garantida</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ÁREAS DE ATUAÇÃO -->
  <section id="areas" class="py-28 bg-[#0e0e10]">
    <div class="max-w-6xl mx-auto px-6">
      <div class="flex items-end justify-between mb-16 border-b border-stone-800 pb-6">
        <div>
          <span class="text-amber-600/70 text-xs tracking-[0.35em] uppercase block mb-3">Especialidades</span>
          <h2 class="serif text-4xl md:text-5xl font-semibold text-stone-100">Áreas de <span class="gold italic">Atuação</span></h2>
        </div>
        <a href="${whatsappUrl}" target="_blank" class="hidden md:inline-flex items-center gap-2 text-amber-500 text-sm hover:text-amber-400 transition-colors">
          Consulta gratuita
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
        </a>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-800/20">
        ${services}
      </div>
    </div>
  </section>

  <!-- ESCRITÓRIO + DIFERENCIAIS -->
  <section id="escritorio" class="py-28 bg-stone-950">
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
        <div class="lg:col-span-3">
          <span class="text-amber-600/70 text-xs tracking-[0.35em] uppercase block mb-4">O Escritório</span>
          <h2 class="serif text-4xl md:text-5xl font-semibold text-stone-100 mb-8 leading-tight">
            Comprometidos com<br /><span class="gold italic">seus direitos.</span>
          </h2>
          <div class="space-y-1">
            ${differentials}
          </div>
        </div>

        <div class="lg:col-span-2">
          <div class="aside-img rounded-xl overflow-hidden mb-5 h-40"></div>
          <div class="border border-stone-800 p-8 bg-stone-950/50">
            <div class="serif text-5xl font-bold gold mb-1">${data.rating?.toFixed(1) ?? "5.0"}★</div>
            <p class="text-stone-500 text-xs uppercase tracking-widest mb-6">Avaliado no Google</p>
            <blockquote class="text-stone-300 text-sm leading-relaxed italic border-l-2 border-amber-700/50 pl-4">
              "${data.testimonials[0]?.text ?? `Atendimento impecável. A ${data.companyName} conduziu meu caso com total profissionalismo e transparência. Recomendo sem hesitar.`}"
            </blockquote>
            <p class="text-stone-500 text-xs mt-4">— ${data.testimonials[0]?.author ?? "Cliente verificado"}</p>
            <div class="hero-line my-6"></div>
            <a href="${whatsappUrl}" target="_blank"
               class="w-full inline-flex items-center justify-center gap-3 bg-amber-700 hover:bg-amber-600 text-white font-medium text-sm px-6 py-3.5 transition-all duration-200">
              Agendar Consulta Gratuita
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA FINAL -->
  <section id="contato" class="py-24 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-r from-stone-950 via-amber-950/10 to-stone-950"></div>
    <div class="absolute inset-0 hero-bg"></div>
    <div class="relative z-10 max-w-3xl mx-auto px-6 text-center">
      <div class="hero-line mb-10 mx-auto max-w-xs"></div>
      <h2 class="serif text-4xl md:text-5xl font-bold text-stone-100 mb-4">
        Seu caso merece<br /><span class="gold italic">atenção especializada.</span>
      </h2>
      <p class="text-stone-400 text-base mb-10 font-light">Consulta inicial gratuita e sem compromisso. Atendemos presencialmente e à distância.</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="${whatsappUrl}" target="_blank"
           class="inline-flex items-center justify-center gap-3 bg-green-700 hover:bg-green-600 text-white font-medium text-sm px-10 py-4 transition-all duration-200 shadow-xl shadow-green-950/50">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
          Falar pelo WhatsApp
        </a>
        <a href="tel:${data.phone.replace(/\D/g, "")}"
           class="inline-flex items-center justify-center gap-2 border border-stone-700 hover:border-amber-600/50 text-stone-300 hover:text-amber-300 text-sm px-10 py-4 transition-all duration-200">
          ${data.phone}
        </a>
      </div>
    </div>
  </section>

  <!-- RODAPÉ -->
  <footer class="bg-stone-950 border-t border-stone-900 py-8">
    <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <p class="text-stone-300 font-medium text-sm">${data.companyName}</p>
        <p class="text-stone-600 text-xs mt-1">${data.address}</p>
      </div>
      <div class="flex items-center gap-6 text-stone-600 text-xs">
        ${data.instagram ? `<a href="https://instagram.com/${data.instagram.replace("@","")}" target="_blank" class="hover:text-amber-500 transition-colors">${data.instagram}</a>` : ""}
        <span>${data.phone}</span>
      </div>
    </div>
  </footer>

</body>
</html>`;
}

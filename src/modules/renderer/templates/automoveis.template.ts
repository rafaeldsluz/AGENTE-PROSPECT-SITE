import type { TemplateData } from "../../../types/template.types.js";

export function renderAutomoveisTemplate(data: TemplateData): string {
  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(data.whatsappMessage)}`;

  const services = data.services
    .map(
      (s, i) => `
      <div class="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-red-600/40 transition-all duration-300 hover:-translate-y-1">
        <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div class="p-7">
          <span class="block text-red-600/40 font-mono text-xs tracking-[0.3em] mb-4">0${i + 1}</span>
          <div class="text-3xl mb-4">${s.icon}</div>
          <h3 class="text-white font-bold text-base mb-2 leading-tight">${s.name}</h3>
          <p class="text-zinc-400 text-sm leading-relaxed">${s.description}</p>
        </div>
      </div>`
    )
    .join("");

  const differentials = data.differentials
    .map(
      (d) => `
      <div class="flex items-start gap-4 py-4 border-b border-zinc-800/60 last:border-0">
        <div class="w-5 h-5 bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"/></svg>
        </div>
        <span class="text-zinc-300 text-sm leading-relaxed">${d}</span>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.companyName} — Automóveis</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700;800;900&family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Barlow', sans-serif; background: #0a0a0a; color: #e5e5e5; }
    .condensed { font-family: 'Barlow Condensed', sans-serif; }
    .hero-img {
      background-image:
        linear-gradient(to right, rgba(10,10,10,0.95) 35%, rgba(10,10,10,0.50) 100%),
        url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1600&q=85&fit=crop');
      background-size: cover;
      background-position: center;
    }
    .showroom-strip {
      background-image:
        linear-gradient(rgba(10,10,10,0.70), rgba(10,10,10,0.70)),
        url('https://images.unsplash.com/photo-1562141961-b04d5c48bd6c?w=1400&q=80&fit=crop');
      background-size: cover;
      background-position: center;
    }
    .interior-card {
      background-image:
        linear-gradient(to top, rgba(10,10,10,0.90), rgba(10,10,10,0.30)),
        url('https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=800&q=80&fit=crop');
      background-size: cover;
      background-position: center;
    }
    .red { color: #e30000; }
    .red-bg { background: #e30000; }
    .red-border { border-color: #e30000; }
    .scan-line {
      background: repeating-linear-gradient(
        90deg, rgba(227,0,0,0.06) 0px, rgba(227,0,0,0.06) 1px,
        transparent 1px, transparent 40px
      );
    }
    .wp-pulse { animation: wpp 2.5s ease-in-out infinite; }
    @keyframes wpp { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.3)} 60%{box-shadow:0 0 0 14px rgba(34,197,94,0)} }
    .slide-in { animation: slideIn 0.5s ease both; }
    @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
  </style>
</head>
<body class="antialiased">

  <!-- NAV -->
  <nav class="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-zinc-800">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        ${data.logoUrl
          ? `<img src="${data.logoUrl}" alt="${data.companyName}" class="h-9 w-auto object-contain" />`
          : `<div class="flex items-center gap-2">
               <div class="w-8 h-8 red-bg flex items-center justify-center font-black text-white text-sm">${data.companyName[0]}</div>
               <span class="condensed font-black text-white text-lg uppercase tracking-wide">${data.companyName}</span>
             </div>`
        }
      </div>
      <div class="hidden md:flex items-center gap-8 text-zinc-400 text-sm font-medium uppercase tracking-widest">
        <a href="#modelos" class="hover:text-red-500 transition-colors">Estoque</a>
        <a href="#servicos" class="hover:text-red-500 transition-colors">Serviços</a>
        <a href="#contato" class="hover:text-red-500 transition-colors">Contato</a>
      </div>
      <a href="${whatsappUrl}" target="_blank"
         class="wp-pulse inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-5 py-2.5 uppercase tracking-wider transition-all duration-200">
        <svg class="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
        WhatsApp
      </a>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero-img scan-line pt-16 min-h-screen flex items-center relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-1 red-bg opacity-90"></div>
    <div class="max-w-6xl mx-auto px-6 py-24 relative z-10 w-full">
      <div class="max-w-xl">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-10 h-px red-border border-t-2"></div>
          <span class="text-red-500 text-xs font-bold uppercase tracking-[0.4em]">${data.city} — Automóveis</span>
        </div>

        <h1 class="condensed font-black uppercase leading-none mb-6">
          <span class="block text-white text-6xl md:text-7xl lg:text-8xl">${data.heroHeadline.split(" ").slice(0, 2).join(" ")}</span>
          <span class="block red text-5xl md:text-6xl lg:text-7xl">${data.heroHeadline.split(" ").slice(2).join(" ") || "você merece"}</span>
        </h1>

        <p class="text-zinc-400 text-lg leading-relaxed mb-10 font-light max-w-md">${data.heroSubtitle}</p>

        <div class="flex flex-col sm:flex-row gap-4 mb-14">
          <a href="${whatsappUrl}" target="_blank"
             class="wp-pulse inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wide text-sm px-8 py-4 transition-all duration-200 shadow-xl shadow-green-900/30">
            <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
            ${data.ctaText}
          </a>
          <a href="tel:${data.phone.replace(/\D/g, "")}"
             class="inline-flex items-center justify-center gap-2 border border-zinc-700 hover:border-red-600/60 text-zinc-300 hover:text-red-400 font-medium text-sm px-8 py-4 transition-all duration-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>
            ${data.phone}
          </a>
        </div>

        <!-- STATS -->
        <div class="grid grid-cols-3 gap-px bg-zinc-800/40 border border-zinc-800/40 max-w-sm">
          <div class="bg-black/60 px-5 py-4 text-center">
            <div class="condensed font-black text-2xl red">${data.reviewCount ? `${Math.floor((data.reviewCount as number) / 10) * 10}+` : "200+"}</div>
            <div class="text-zinc-500 text-xs uppercase tracking-wider mt-0.5">Veículos</div>
          </div>
          <div class="bg-black/60 px-5 py-4 text-center">
            <div class="condensed font-black text-2xl red">${data.rating?.toFixed(1) ?? "5.0"}★</div>
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

  <!-- FINANCIAMENTO BANNER -->
  <div class="red-bg py-5">
    <div class="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <span class="condensed font-black text-white text-2xl uppercase">Financie em até 60x</span>
        <span class="text-white/60 text-sm font-light">· parcelas que cabem no seu bolso</span>
      </div>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-2 bg-black/30 hover:bg-black/50 text-white font-bold text-xs px-5 py-2.5 uppercase tracking-widest border border-white/20 transition-all">
        Simular agora
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </a>
    </div>
  </div>

  <!-- SERVIÇOS / DIFERENCIAIS -->
  <section id="modelos" class="py-24 bg-zinc-950">
    <div class="max-w-6xl mx-auto px-6">
      <div class="flex items-end justify-between mb-12 pb-6 border-b border-zinc-800">
        <div>
          <span class="red text-xs font-bold uppercase tracking-[0.35em] block mb-2">O que oferecemos</span>
          <h2 class="condensed text-4xl md:text-5xl font-black uppercase text-white">
            Estoque & <span class="red">Serviços</span>
          </h2>
        </div>
        <a href="${whatsappUrl}" target="_blank" class="hidden md:inline-flex items-center gap-2 text-red-500 text-sm font-medium hover:text-red-400 uppercase tracking-wide">
          Ver tudo
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
        </a>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800/30">
        ${services}
      </div>
    </div>
  </section>

  <!-- FAIXA SHOWROOM -->
  <div class="showroom-strip h-52 w-full flex items-center justify-center relative">
    <div class="text-center z-10">
      <p class="condensed font-black text-white text-4xl md:text-5xl uppercase tracking-widest drop-shadow-2xl">Venha conhecer nosso showroom</p>
      <p class="text-white/60 text-sm mt-2 uppercase tracking-widest">${data.address}</p>
    </div>
  </div>

  <!-- DIFERENCIAIS + INTERIOR -->
  <section id="servicos" class="py-24 bg-zinc-900">
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

        <div>
          <span class="red text-xs font-bold uppercase tracking-[0.35em] block mb-4">Por que escolher a gente</span>
          <h2 class="condensed text-4xl md:text-5xl font-black uppercase text-white mb-8 leading-tight">
            Transparência e<br /><span class="red">confiança</span> em cada negociação.
          </h2>
          <div>
            ${differentials}
          </div>
          ${data.testimonials[0] ? `
          <blockquote class="mt-8 border-l-2 border-red-600 pl-5">
            <p class="text-zinc-400 text-sm italic leading-relaxed">"${data.testimonials[0].text}"</p>
            <cite class="text-zinc-500 text-xs mt-2 block">— ${data.testimonials[0].author}</cite>
          </blockquote>` : ""}
        </div>

        <!-- INTERIOR CARD + CONTATO -->
        <div class="space-y-4">
          <div class="interior-card h-52 rounded-none flex items-end p-6">
            <div>
              <p class="condensed font-black text-white text-2xl uppercase">Comfort. Performance. Estilo.</p>
              <p class="text-white/60 text-sm">Veículos selecionados com rigor</p>
            </div>
          </div>

          <div id="contato" class="bg-zinc-950 border border-zinc-800 p-8 relative">
            <div class="absolute top-0 left-0 w-1 h-full red-bg"></div>
            <h3 class="condensed text-2xl font-black uppercase text-white mb-2">Fale com um consultor</h3>
            <p class="text-zinc-400 text-sm mb-6">Atendimento personalizado. Sem pressão, sem enrolação.</p>
            <div class="space-y-3 mb-7">
              <div class="flex items-center gap-3 text-zinc-300 text-sm">
                <span class="red text-base">📍</span> ${data.address}
              </div>
              <div class="flex items-center gap-3 text-zinc-300 text-sm">
                <span class="red text-base">📞</span> ${data.phone}
              </div>
              ${data.instagram ? `<div class="flex items-center gap-3 text-zinc-300 text-sm"><span class="red text-base">📸</span> ${data.instagram}</div>` : ""}
              <div class="flex items-center gap-3 text-zinc-300 text-sm">
                <span class="red text-base">🕐</span> Seg–Sex 8h–18h · Sáb 8h–14h
              </div>
            </div>
            <a href="${whatsappUrl}" target="_blank"
               class="w-full inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wide text-sm px-6 py-4 transition-all duration-200">
              <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
              Falar com Consultor
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA FINAL — TEST DRIVE -->
  <section class="red-bg py-20 relative overflow-hidden">
    <div class="absolute inset-0 scan-line opacity-30"></div>
    <div class="relative z-10 max-w-4xl mx-auto px-6 text-center">
      <p class="text-white/50 font-bold uppercase tracking-[0.4em] text-xs mb-4">Próximo passo</p>
      <h2 class="condensed font-black text-white uppercase text-5xl md:text-6xl leading-tight mb-4">
        Agende seu<br />Test Drive Hoje
      </h2>
      <p class="text-white/70 text-base mb-10 max-w-md mx-auto font-light">
        Venha experimentar o veículo dos seus sonhos sem compromisso. Nossa equipe está pronta para te atender.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="${whatsappUrl}" target="_blank"
           class="inline-flex items-center justify-center gap-3 bg-white text-red-600 font-black uppercase tracking-wide text-sm px-10 py-4 hover:bg-zinc-100 transition-all duration-200 shadow-2xl">
          <svg class="w-5 h-5 fill-green-600" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
          Agendar pelo WhatsApp
        </a>
        <a href="tel:${data.phone.replace(/\D/g, "")}"
           class="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white font-bold uppercase tracking-wide text-sm px-10 py-4 hover:bg-white/10 transition-all duration-200">
          Ligar Agora
        </a>
      </div>
    </div>
  </section>

  <footer class="bg-black border-t border-zinc-900 py-8">
    <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <p class="condensed font-black text-white uppercase tracking-wide">${data.companyName}</p>
        <p class="text-zinc-600 text-xs mt-1">${data.address} · ${data.city}</p>
      </div>
      <div class="flex items-center gap-6 text-zinc-600 text-xs">
        ${data.instagram ? `<a href="https://instagram.com/${data.instagram.replace("@","")}" target="_blank" class="hover:text-red-500 transition-colors">${data.instagram}</a>` : ""}
        <a href="tel:${data.phone.replace(/\D/g,"")}" class="hover:text-white transition-colors">${data.phone}</a>
      </div>
    </div>
  </footer>

</body>
</html>`;
}

import type { TemplateData } from "../../../types/template.types.js";

export function renderAdvogadoTemplate(data: TemplateData): string {
  const services = data.services
    .map(
      (s) => `
      <div class="relative bg-slate-800/60 border border-amber-600/20 rounded-2xl p-7 hover:border-amber-500/50 transition-all duration-300 group">
        <div class="text-3xl mb-4 opacity-90">${s.icon}</div>
        <h3 class="text-amber-400 font-bold text-lg mb-2 group-hover:text-amber-300 transition-colors">${s.name}</h3>
        <p class="text-slate-400 text-sm leading-relaxed">${s.description}</p>
      </div>`
    )
    .join("");

  const differentials = data.differentials
    .map(
      (d) => `
      <div class="flex items-start gap-4">
        <div class="w-5 h-5 mt-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
          <svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"/></svg>
        </div>
        <span class="text-slate-300 text-sm leading-relaxed">${d}</span>
      </div>`
    )
    .join("");

  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, gostaria de agendar uma consulta com ${data.companyName}.`)}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.companyName} — Advocacia</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', sans-serif; }
    .serif { font-family: 'Playfair Display', serif; }
    .gold-text { background: linear-gradient(135deg, #c9a84c, #f0d080, #c9a84c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-bg { background: radial-gradient(ellipse at top, #0f1628 0%, #070b14 60%), url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a84c' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
    .divider { width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); }
    .whatsapp-pulse { animation: wpulse 2s infinite; }
    @keyframes wpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.3); } 70% { box-shadow: 0 0 0 12px rgba(37,211,102,0); } }
  </style>
</head>
<body class="bg-slate-900 text-white">

  <!-- HERO -->
  <section class="hero-bg min-h-screen flex flex-col justify-center relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-60"></div>
    <div class="container mx-auto px-6 py-24 relative z-10">
      <div class="max-w-3xl mx-auto text-center">
        ${data.logoUrl ? `<div class="mb-8 flex justify-center"><img src="${data.logoUrl}" alt="Logo ${data.companyName}" class="h-16 w-auto object-contain opacity-90" /></div>` : ""}
        <div class="inline-flex items-center gap-2 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400/80 text-xs font-medium tracking-widest uppercase mb-8">
          ⚖ &nbsp;${data.city} &nbsp;·&nbsp; Advocacia
        </div>
        <h1 class="serif text-5xl md:text-6xl font-black leading-tight mb-6">
          <span class="gold-text">${data.heroHeadline}</span>
        </h1>
        <div class="divider mx-auto my-6"></div>
        <p class="text-slate-300 text-lg leading-relaxed mb-10 max-w-xl mx-auto">${data.heroSubtitle}</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="${whatsappUrl}" target="_blank"
             class="whatsapp-pulse inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold text-base px-8 py-4 rounded-xl transition-all duration-300">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
            ${data.ctaText}
          </a>
          <a href="tel:${data.phone.replace(/\D/g, "")}"
             class="inline-flex items-center gap-3 border border-slate-600 hover:border-amber-500/50 text-slate-200 font-medium text-base px-8 py-4 rounded-xl transition-all duration-300">
            <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>
            ${data.phone}
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- ÁREAS DE ATUAÇÃO -->
  <section class="bg-slate-900 py-24 border-t border-slate-800">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-amber-500/80 font-medium text-xs uppercase tracking-[0.2em]">Atuação</span>
        <h2 class="serif text-4xl font-bold mt-3 text-white">Áreas de <span class="gold-text">Especialidade</span></h2>
        <div class="divider mx-auto mt-4"></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${services}
      </div>
    </div>
  </section>

  <!-- DIFERENCIAIS -->
  <section class="bg-slate-800/40 py-24 border-t border-slate-800">
    <div class="container mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <span class="text-amber-500/80 font-medium text-xs uppercase tracking-[0.2em]">Por que nos escolher</span>
          <h2 class="serif text-4xl font-bold mt-3 mb-8">Compromisso com <span class="gold-text">Resultados</span></h2>
          <div class="space-y-5">
            ${differentials}
          </div>
        </div>
        <div class="bg-slate-800 border border-amber-600/20 rounded-3xl p-10 text-center">
          <div class="text-6xl font-black gold-text serif mb-2">${data.reviewCount ?? "5.0"}★</div>
          <div class="text-slate-400 text-sm mb-6">avaliações verificadas no Google</div>
          <blockquote class="text-slate-300 italic leading-relaxed text-sm">
            "${data.testimonials[0]?.text ?? `Atendimento extremamente profissional e dedicado. A ${data.companyName} resolveu meu caso com eficiência e transparência.`}"
          </blockquote>
          <a href="${whatsappUrl}" target="_blank"
             class="inline-block mt-8 bg-amber-600 hover:bg-amber-500 text-white font-bold px-8 py-3 rounded-xl transition-all duration-300 text-sm">
            Agendar Consulta Gratuita
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA FINAL -->
  <section class="py-20 border-t border-amber-600/20 bg-gradient-to-b from-slate-900 to-slate-950">
    <div class="container mx-auto px-6 text-center">
      <h2 class="serif text-4xl font-bold text-white mb-4">Seu problema tem solução.</h2>
      <p class="text-slate-400 text-lg mb-8 max-w-md mx-auto">Entre em contato agora e agende uma consulta inicial sem compromisso.</p>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all duration-300 shadow-xl shadow-green-900/30">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
        Falar com Advogado Agora
      </a>
    </div>
  </section>

  <!-- RODAPÉ -->
  <footer class="bg-slate-950 border-t border-slate-800 py-8">
    <div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3">
      <div>
        <p class="text-white font-semibold">${data.companyName}</p>
        <p class="text-slate-500 text-sm">${data.address}</p>
      </div>
      <p class="text-slate-500 text-sm">${data.phone}</p>
    </div>
  </footer>

</body>
</html>`;
}

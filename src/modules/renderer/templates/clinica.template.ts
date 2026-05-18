import type { TemplateData } from "../../../types/template.types.js";

export function renderClinicaTemplate(data: TemplateData): string {
  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(data.whatsappMessage)}`;

  const services = data.services
    .map(
      (s) => `
      <div class="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div class="text-4xl mb-4">${s.icon}</div>
        <h3 class="text-slate-800 font-bold text-lg mb-2">${s.name}</h3>
        <p class="text-slate-500 text-sm leading-relaxed">${s.description}</p>
      </div>`
    )
    .join("");

  const differentials = data.differentials
    .map(
      (d) => `
      <div class="flex items-start gap-4 p-4 bg-sky-50 rounded-xl">
        <div class="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"/></svg>
        </div>
        <span class="text-slate-700 font-medium">${d}</span>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.companyName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { font-family: 'Inter', sans-serif; }
    .hero-gradient { background: linear-gradient(135deg, #0f172a 0%, #0c4a6e 60%, #0369a1 100%); }
    .whatsapp-btn { animation: gentle-pulse 3s ease-in-out infinite; }
    @keyframes gentle-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
  </style>
</head>
<body class="bg-slate-50 text-slate-800">

  <!-- NAV -->
  <nav class="bg-white shadow-sm sticky top-0 z-50">
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
      <div class="flex items-center gap-3">
        ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo" class="h-10 w-auto object-contain rounded-lg" />` : `<div class="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">${data.companyName[0]}</div>`}
        <span class="font-bold text-slate-800 text-lg">${data.companyName}</span>
      </div>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 text-sm">
        <svg class="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
        Agendar Consulta
      </a>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero-gradient py-28 text-white overflow-hidden relative">
    <div class="absolute inset-0 opacity-10">
      <div class="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-sky-400 blur-3xl"></div>
      <div class="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-400 blur-3xl"></div>
    </div>
    <div class="container mx-auto px-6 relative z-10">
      <div class="max-w-3xl">
        <div class="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-400/30 rounded-full px-4 py-2 text-sky-300 text-sm mb-6">
          📍 ${data.city} · Atendimento Especializado
        </div>
        <h1 class="text-5xl md:text-6xl font-extrabold leading-tight mb-6">${data.heroHeadline}</h1>
        <p class="text-xl text-sky-100 mb-10 leading-relaxed">${data.heroSubtitle}</p>
        <div class="flex flex-wrap gap-4">
          <a href="${whatsappUrl}" target="_blank"
             class="whatsapp-btn inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-all duration-200">
            <svg class="w-6 h-6 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
            ${data.ctaText}
          </a>
          <div class="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-4 rounded-2xl">
            <div class="text-yellow-400">⭐⭐⭐⭐⭐</div>
            <div>
              <div class="font-bold">${data.rating?.toFixed(1) ?? "5.0"} no Google</div>
              <div class="text-sky-200 text-sm">${data.reviewCount ?? 0}+ avaliações</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- SERVIÇOS -->
  <section class="py-24 bg-white">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-sky-600 font-semibold text-sm uppercase tracking-widest">O que oferecemos</span>
        <h2 class="text-4xl font-extrabold text-slate-800 mt-2">Serviços <span class="text-sky-500">Especializados</span></h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${services}
      </div>
    </div>
  </section>

  <!-- DIFERENCIAIS -->
  <section class="py-24 bg-slate-50">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-sky-600 font-semibold text-sm uppercase tracking-widest">Por que nos escolher</span>
        <h2 class="text-4xl font-extrabold text-slate-800 mt-2">Nossos Diferenciais</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        ${differentials}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="bg-sky-600 py-20">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-4xl font-extrabold text-white mb-4">Agende sua consulta hoje</h2>
      <p class="text-sky-100 text-xl mb-8">Atendimento humano e especializado do início ao fim.</p>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-3 bg-white text-sky-600 font-bold text-xl px-10 py-5 rounded-2xl hover:bg-sky-50 transition-all duration-200 shadow-xl">
        Agendar pelo WhatsApp
      </a>
    </div>
  </section>

  <footer class="bg-slate-800 text-slate-400 py-8">
    <div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <p class="text-white font-semibold">${data.companyName}</p>
        <p class="text-sm">${data.address}</p>
      </div>
      <p class="text-sm">${data.phone}</p>
    </div>
  </footer>

</body>
</html>`;
}

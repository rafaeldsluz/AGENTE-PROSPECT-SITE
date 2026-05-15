import type { TemplateData } from "../../../types/template.types.js";

export function renderOficinaTemplate(data: TemplateData): string {
  const services = data.services
    .map(
      (s) => `
      <div class="bg-gray-800 rounded-xl p-6 border border-orange-500/20 hover:border-orange-500/60 transition-all duration-300">
        <div class="text-4xl mb-3">${s.icon}</div>
        <h3 class="text-orange-400 font-bold text-lg mb-2">${s.name}</h3>
        <p class="text-gray-400 text-sm">${s.description}</p>
      </div>`
    )
    .join("");

  const differentials = data.differentials
    .map(
      (d) => `
      <div class="flex items-center gap-3">
        <div class="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
          <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"/></svg>
        </div>
        <span class="text-gray-300">${d}</span>
      </div>`
    )
    .join("");

  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vi o site da ${data.companyName} e gostaria de mais informações.`)}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.companyName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { font-family: 'Inter', sans-serif; }
    .gradient-text { background: linear-gradient(135deg, #f97316, #fb923c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-bg { background: linear-gradient(135deg, #0f0f1a 0%, #1a0f00 50%, #0a0a0a 100%); }
    .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(249,115,22,0.15); }
    .whatsapp-pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.4); } 70% { box-shadow: 0 0 0 15px rgba(37,211,102,0); } }
  </style>
</head>
<body class="bg-gray-950 text-white">

  <!-- HERO -->
  <section class="hero-bg min-h-screen flex flex-col justify-center relative overflow-hidden">
    <div class="absolute inset-0 opacity-5">
      <div class="absolute top-20 left-20 w-64 h-64 rounded-full bg-orange-500 blur-3xl"></div>
      <div class="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-orange-700 blur-3xl"></div>
    </div>
    <div class="container mx-auto px-6 py-20 relative z-10">
      <div class="max-w-4xl mx-auto text-center">
        ${data.logoUrl ? `<div class="mb-8 flex justify-center"><img src="${data.logoUrl}" alt="Logo" class="h-20 w-auto object-contain rounded-xl" /></div>` : ""}
        <div class="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2 text-orange-400 text-sm font-medium mb-6">
          <span class="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
          ${data.city} • Atendimento Especializado
        </div>
        <h1 class="text-5xl md:text-7xl font-black mb-6 leading-tight">
          <span class="gradient-text">${data.heroHeadline}</span>
        </h1>
        <p class="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">${data.heroSubtitle}</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="${whatsappUrl}" target="_blank"
             class="whatsapp-pulse inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-300">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
            ${data.ctaText}
          </a>
          <a href="tel:${data.phone.replace(/\D/g, "")}"
             class="inline-flex items-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-300">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>
            ${data.phone}
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- SERVIÇOS -->
  <section class="bg-gray-950 py-24">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-orange-400 font-semibold text-sm uppercase tracking-widest">O que fazemos</span>
        <h2 class="text-4xl font-black mt-2">Nossos <span class="gradient-text">Serviços</span></h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${services}
      </div>
    </div>
  </section>

  <!-- DIFERENCIAIS -->
  <section class="bg-gray-900 py-24">
    <div class="container mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <span class="text-orange-400 font-semibold text-sm uppercase tracking-widest">Por que escolher a gente</span>
          <h2 class="text-4xl font-black mt-2 mb-8">Nossos <span class="gradient-text">Diferenciais</span></h2>
          <div class="space-y-4">
            ${differentials}
          </div>
          <a href="${whatsappUrl}" target="_blank"
             class="inline-flex items-center gap-3 mt-8 bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-300">
            Solicitar Orçamento
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </a>
        </div>
        <div class="relative">
          <div class="bg-gray-800 rounded-3xl p-8 border border-orange-500/20">
            <div class="text-center">
              <div class="text-7xl font-black gradient-text mb-2">${data.reviewCount ?? "5★"}</div>
              <div class="text-gray-400">avaliações no Google</div>
              <div class="flex justify-center mt-4">
                ${"⭐".repeat(Math.round(data.testimonials[0]?.rating ?? 5))}
              </div>
              <p class="text-gray-300 mt-4 text-lg font-medium">"${data.testimonials[0]?.text ?? `Melhor oficina da região! Recomendo muito a ${data.companyName}.`}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA FINAL -->
  <section class="bg-gradient-to-r from-orange-600 to-orange-500 py-20">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-4xl font-black text-white mb-4">Pronto para começar?</h2>
      <p class="text-orange-100 text-xl mb-8">Entre em contato agora e receba um orçamento gratuito.</p>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-3 bg-white text-orange-600 font-black text-xl px-10 py-5 rounded-2xl hover:bg-orange-50 transition-all duration-300 shadow-2xl">
        <svg class="w-7 h-7 fill-green-500" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
        Falar no WhatsApp
      </a>
    </div>
  </section>

  <!-- RODAPÉ -->
  <footer class="bg-gray-950 border-t border-gray-800 py-8">
    <div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <p class="text-white font-bold text-lg">${data.companyName}</p>
        <p class="text-gray-500 text-sm">${data.address}</p>
      </div>
      <div class="text-gray-500 text-sm">${data.phone}</div>
    </div>
  </footer>

</body>
</html>`;
}

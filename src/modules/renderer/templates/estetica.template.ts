import type { TemplateData } from "../../../types/template.types.js";

export function renderEsteticaTemplate(data: TemplateData): string {
  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Gostaria de agendar um horário no ${data.companyName}.`)}`;

  const services = data.services
    .map(
      (s) => `
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-rose-50 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <div class="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">${s.icon}</div>
        <h3 class="font-bold text-rose-900 text-base mb-2">${s.name}</h3>
        <p class="text-rose-400 text-sm">${s.description}</p>
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
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    h1, h2, h3 { font-family: 'Cormorant Garamond', serif; }
    body { font-family: 'Inter', sans-serif; }
    .hero-gradient { background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 40%, #fce7f3 100%); }
    .rose-gold { background: linear-gradient(135deg, #c9a96e, #e8c99a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  </style>
</head>
<body class="bg-rose-50">

  <!-- NAV -->
  <nav class="bg-white/80 backdrop-blur-md border-b border-rose-100 sticky top-0 z-50">
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
      <div class="flex items-center gap-3">
        ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo" class="h-10 w-auto object-contain rounded-full" />` : ""}
        <span class="font-semibold text-rose-900 text-lg">${data.companyName}</span>
      </div>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white font-medium px-5 py-2.5 rounded-full transition-all text-sm">
        ✨ Agendar Horário
      </a>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero-gradient py-28">
    <div class="container mx-auto px-6">
      <div class="max-w-2xl mx-auto text-center">
        <div class="inline-block bg-rose-100 text-rose-500 rounded-full px-4 py-2 text-sm font-medium mb-6">
          ✨ Beleza & Bem-Estar · ${data.city}
        </div>
        <h1 class="text-6xl md:text-7xl text-rose-900 leading-tight mb-6 font-bold">${data.heroHeadline}</h1>
        <p class="text-rose-600 text-xl mb-10 leading-relaxed">${data.heroSubtitle}</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="${whatsappUrl}" target="_blank"
             class="inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-all">
            <svg class="w-6 h-6 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
            ${data.ctaText}
          </a>
          <div class="inline-flex items-center gap-2 bg-white border border-rose-100 text-rose-700 font-medium px-6 py-4 rounded-2xl">
            ⭐ ${data.rating?.toFixed(1) ?? "5.0"} · ${data.reviewCount ?? 0}+ avaliações
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- SERVIÇOS -->
  <section class="py-24 bg-white">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-rose-400 font-medium text-sm uppercase tracking-widest">Cuide de você</span>
        <h2 class="text-4xl text-rose-900 font-bold mt-2">Nossos Serviços</h2>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${services}
      </div>
    </div>
  </section>

  <!-- DEPOIMENTO -->
  <section class="py-20 bg-rose-900 text-white">
    <div class="container mx-auto px-6 text-center">
      <div class="text-4xl mb-4">💬</div>
      <p class="text-2xl max-w-2xl mx-auto italic font-light leading-relaxed mb-6">
        "${data.testimonials[0]?.text ?? `O ${data.companyName} é incrível! Saí completamente renovada. Super recomendo!`}"
      </p>
      <div class="text-rose-300">⭐⭐⭐⭐⭐ · ${data.reviewCount ?? 0}+ clientes felizes</div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 bg-gradient-to-br from-rose-400 to-pink-500">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-4xl font-bold text-white mb-4">Reserve seu horário agora</h2>
      <p class="text-rose-100 text-xl mb-8">Atendimento exclusivo e personalizado para você.</p>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-3 bg-white text-rose-600 font-bold text-xl px-10 py-5 rounded-2xl hover:bg-rose-50 transition-all shadow-xl">
        Agendar pelo WhatsApp ✨
      </a>
    </div>
  </section>

  <footer class="bg-rose-950 text-rose-400 py-8">
    <div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-white font-semibold">${data.companyName}</p>
      <p class="text-sm">${data.address} · ${data.phone}</p>
    </div>
  </footer>

</body>
</html>`;
}

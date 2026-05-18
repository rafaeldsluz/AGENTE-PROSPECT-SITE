import type { TemplateData } from "../../../types/template.types.js";

export function renderImoveisTemplate(data: TemplateData): string {
  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(data.whatsappMessage)}`;

  const services = data.services
    .map(
      (s) => `
      <div class="flex items-start gap-5 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">${s.icon}</div>
        <div>
          <h3 class="font-bold text-slate-800 text-lg mb-1">${s.name}</h3>
          <p class="text-slate-500 text-sm">${s.description}</p>
        </div>
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
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    h1, h2 { font-family: 'Cormorant Garamond', serif; }
    body { font-family: 'Inter', sans-serif; }
    .hero-bg { background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #0f2027 100%); }
  </style>
</head>
<body class="bg-slate-50">

  <!-- NAV -->
  <nav class="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-50">
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
      <div class="flex items-center gap-3">
        ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo" class="h-10 w-auto object-contain" />` : ""}
        <div>
          <span class="font-semibold text-slate-800">${data.companyName}</span>
          <div class="text-xs text-emerald-600 font-medium">CRECI Registrada</div>
        </div>
      </div>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm">
        Falar com Corretor
      </a>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero-bg py-32 text-white">
    <div class="container mx-auto px-6">
      <div class="max-w-3xl">
        <div class="inline-flex items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 rounded-full px-4 py-2 text-emerald-300 text-sm mb-8">
          🏠 Imóveis em ${data.city}
        </div>
        <h1 class="text-6xl md:text-7xl leading-none mb-6">${data.heroHeadline}</h1>
        <p class="text-slate-300 text-xl mb-10 leading-relaxed max-w-xl">${data.heroSubtitle}</p>
        <div class="flex flex-wrap gap-4">
          <a href="${whatsappUrl}" target="_blank"
             class="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg">
            <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
            ${data.ctaText}
          </a>
          <div class="flex items-center gap-3 bg-white/10 backdrop-blur border border-white/20 px-6 py-4 rounded-2xl">
            <span class="text-2xl font-bold">${data.rating?.toFixed(1) ?? "5.0"}</span>
            <div>
              <div class="text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
              <div class="text-slate-300 text-xs">${data.reviewCount ?? 0} avaliações</div>
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
        <span class="text-emerald-600 font-semibold text-sm uppercase tracking-widest">Como podemos ajudar</span>
        <h2 class="text-4xl font-black mt-2 text-slate-800">Serviços Imobiliários</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        ${services}
      </div>
    </div>
  </section>

  <!-- STATS -->
  <section class="py-20 bg-emerald-800 text-white">
    <div class="container mx-auto px-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div><div class="text-5xl font-bold mb-2">${data.reviewCount ?? "100"}+</div><div class="text-emerald-200">Clientes Satisfeitos</div></div>
        <div><div class="text-5xl font-bold mb-2">98%</div><div class="text-emerald-200">Taxa de Satisfação</div></div>
        <div><div class="text-5xl font-bold mb-2">${data.rating?.toFixed(1) ?? "4.9"}</div><div class="text-emerald-200">Nota no Google</div></div>
        <div><div class="text-5xl font-bold mb-2">10+</div><div class="text-emerald-200">Anos de Mercado</div></div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 bg-slate-50">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-4xl font-black text-slate-800 mb-4">Encontre o imóvel ideal</h2>
      <p class="text-slate-500 text-xl mb-8">Fale agora com nossos corretores especializados.</p>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-3 bg-emerald-600 text-white font-bold text-xl px-10 py-5 rounded-2xl hover:bg-emerald-500 transition-all shadow-xl">
        Falar com Corretor
      </a>
    </div>
  </section>

  <footer class="bg-slate-900 text-slate-400 py-8">
    <div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-white font-semibold">${data.companyName} · ${data.city}</p>
      <p class="text-sm">${data.address}</p>
    </div>
  </footer>

</body>
</html>`;
}

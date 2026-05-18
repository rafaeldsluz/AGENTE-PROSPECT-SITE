import type { TemplateData } from "../../../types/template.types.js";

export function renderRestauranteTemplate(data: TemplateData): string {
  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(data.whatsappMessage)}`;

  const services = data.services
    .map(
      (s) => `
      <div class="text-center p-6">
        <div class="text-5xl mb-4">${s.icon}</div>
        <h3 class="font-bold text-amber-900 text-lg mb-2">${s.name}</h3>
        <p class="text-amber-700 text-sm">${s.description}</p>
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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    h1, h2 { font-family: 'Playfair Display', serif; }
    body { font-family: 'Inter', sans-serif; }
    .hero-bg { background: linear-gradient(to bottom, rgba(28,10,0,0.85) 0%, rgba(28,10,0,0.6) 100%), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80') center/cover; }
    .divider { background: linear-gradient(90deg, transparent, #d97706, transparent); height: 1px; }
  </style>
</head>
<body class="bg-amber-50 text-amber-900">

  <!-- HERO -->
  <section class="hero-bg min-h-screen flex items-center">
    <div class="container mx-auto px-6 py-20 text-center text-white">
      ${data.logoUrl ? `<div class="mb-6 flex justify-center"><img src="${data.logoUrl}" alt="Logo" class="h-20 w-auto object-contain rounded-xl opacity-95" /></div>` : ""}
      <div class="inline-block bg-amber-600/30 border border-amber-400/40 backdrop-blur-sm rounded-full px-5 py-2 text-amber-300 text-sm mb-6">
        🍽️ ${data.city} · Gastronomia de Qualidade
      </div>
      <h1 class="text-6xl md:text-8xl font-black mb-4 text-white leading-none">${data.companyName}</h1>
      <div class="divider w-32 mx-auto my-6"></div>
      <p class="text-2xl text-amber-100 mb-4 font-light">${data.heroHeadline}</p>
      <p class="text-amber-200 text-lg mb-10 max-w-xl mx-auto">${data.heroSubtitle}</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="${whatsappUrl}" target="_blank"
           class="inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-xl">
          <svg class="w-6 h-6 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
          ${data.ctaText}
        </a>
        <a href="tel:${data.phone.replace(/\D/g, "")}"
           class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all hover:bg-white/20">
          📞 ${data.phone}
        </a>
      </div>
    </div>
  </section>

  <!-- ESPECIALIDADES -->
  <section class="py-24 bg-white">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-amber-600 font-semibold text-sm uppercase tracking-widest">Cardápio Destaque</span>
        <h2 class="text-4xl font-black mt-2">Nossas Especialidades</h2>
        <div class="divider w-24 mx-auto mt-6"></div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        ${services}
      </div>
    </div>
  </section>

  <!-- AVALIAÇÕES -->
  <section class="py-20 bg-amber-900 text-white">
    <div class="container mx-auto px-6 text-center">
      <div class="text-6xl mb-4">⭐⭐⭐⭐⭐</div>
      <div class="text-5xl font-black mb-2">${data.rating?.toFixed(1) ?? "4.9"}</div>
      <div class="text-amber-200 mb-2">${data.reviewCount ?? 0}+ avaliações no Google</div>
      <p class="text-amber-100 text-xl max-w-2xl mx-auto mt-6 italic">"${data.testimonials[0]?.text ?? `Comida deliciosa e atendimento impecável. O ${data.companyName} é sem dúvida o melhor da região!`}"</p>
    </div>
  </section>

  <!-- CTA -->
  <section class="bg-amber-600 py-20">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-4xl font-black text-white mb-4">Reserve sua mesa agora!</h2>
      <p class="text-amber-100 text-xl mb-8">Delivery disponível. Atendimento pelo WhatsApp.</p>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-3 bg-white text-amber-700 font-black text-xl px-10 py-5 rounded-2xl hover:bg-amber-50 transition-all shadow-xl">
        Fazer Pedido ou Reserva
      </a>
    </div>
  </section>

  <footer class="bg-amber-950 text-amber-400 py-8">
    <div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-white font-semibold">${data.companyName} · ${data.city}</p>
      <p class="text-sm">${data.address}</p>
    </div>
  </footer>

</body>
</html>`;
}

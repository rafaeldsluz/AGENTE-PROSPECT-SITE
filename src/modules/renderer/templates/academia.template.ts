import type { TemplateData } from "../../../types/template.types.js";

export function renderAcademiaTemplate(data: TemplateData): string {
  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(data.whatsappMessage)}`;

  const services = data.services
    .map(
      (s) => `
      <div class="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-yellow-400/50 rounded-2xl p-6 transition-all duration-300">
        <div class="absolute top-0 right-0 w-20 h-20 bg-yellow-400/5 rounded-bl-3xl group-hover:w-32 group-hover:h-32 transition-all duration-500"></div>
        <div class="text-4xl mb-4">${s.icon}</div>
        <h3 class="text-yellow-400 font-black text-lg mb-2 uppercase tracking-wide">${s.name}</h3>
        <p class="text-zinc-400 text-sm">${s.description}</p>
      </div>`
    )
    .join("");

  const plans = [
    { name: "Mensal", price: "Consulte", tag: "" },
    { name: "Trimestral", price: "Consulte", tag: "POPULAR" },
    { name: "Anual", price: "Consulte", tag: "MELHOR VALOR" },
  ];

  const planCards = plans
    .map(
      (p) => `
      <div class="bg-zinc-900 border ${p.tag === "POPULAR" ? "border-yellow-400" : "border-zinc-700"} rounded-2xl p-8 text-center relative">
        ${p.tag ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-black px-4 py-1 rounded-full">${p.tag}</div>` : ""}
        <h3 class="text-white font-black text-xl mb-2">${p.name}</h3>
        <div class="text-yellow-400 text-4xl font-black my-4">${p.price}</div>
        <a href="${whatsappUrl}" class="block w-full text-center ${p.tag === "POPULAR" ? "bg-yellow-400 hover:bg-yellow-300 text-black" : "bg-zinc-800 hover:bg-zinc-700 text-white"} font-bold py-3 rounded-xl transition-all">Quero esse plano</a>
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { font-family: 'Inter', sans-serif; }
    .hero-bg { background: linear-gradient(135deg, #09090b 0%, #18181b 50%, #0a0a00 100%); }
    .yellow-glow { text-shadow: 0 0 40px rgba(234,179,8,0.5); }
  </style>
</head>
<body class="bg-zinc-950 text-white">

  <!-- HERO -->
  <section class="hero-bg min-h-screen flex items-center relative overflow-hidden">
    <div class="absolute inset-0">
      <div class="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-yellow-400/20 via-transparent to-transparent"></div>
      <div class="absolute top-1/4 right-0 w-64 h-64 rounded-full bg-yellow-400/5 blur-3xl"></div>
    </div>
    <div class="container mx-auto px-6 relative z-10">
      <div class="max-w-5xl mx-auto text-center">
        ${data.logoUrl ? `<div class="mb-8 flex justify-center"><img src="${data.logoUrl}" alt="Logo" class="h-16 w-auto object-contain" /></div>` : ""}
        <div class="inline-flex items-center gap-2 border border-yellow-400/30 bg-yellow-400/5 rounded-full px-4 py-2 text-yellow-400 text-sm font-semibold mb-8">
          💪 Academia Premium · ${data.city}
        </div>
        <h1 class="text-6xl md:text-8xl font-black leading-none mb-6 yellow-glow">
          ${data.heroHeadline.toUpperCase()}
        </h1>
        <p class="text-zinc-300 text-xl mb-10 max-w-2xl mx-auto">${data.heroSubtitle}</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href="${whatsappUrl}" target="_blank"
             class="inline-flex items-center gap-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-lg px-10 py-4 rounded-2xl transition-all shadow-2xl shadow-yellow-400/20">
            <svg class="w-6 h-6 fill-black" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
            ${data.ctaText}
          </a>
          <div class="text-zinc-400 text-sm">
            ⭐ ${data.rating?.toFixed(1) ?? "4.9"} · ${data.reviewCount ?? 0}+ alunos avaliaram
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- MODALIDADES -->
  <section class="py-24 bg-zinc-900">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-yellow-400 font-black text-sm uppercase tracking-widest">Estrutura Completa</span>
        <h2 class="text-4xl font-black mt-2">Modalidades & Serviços</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${services}
      </div>
    </div>
  </section>

  <!-- PLANOS -->
  <section class="py-24 bg-zinc-950">
    <div class="container mx-auto px-6">
      <div class="text-center mb-16">
        <span class="text-yellow-400 font-black text-sm uppercase tracking-widest">Invista no seu corpo</span>
        <h2 class="text-4xl font-black mt-2">Planos de Matrícula</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        ${planCards}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="bg-yellow-400 py-20">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-4xl font-black text-black mb-4">Comece sua transformação hoje</h2>
      <p class="text-yellow-900 text-xl mb-8">Primeira semana grátis para novos alunos!</p>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-3 bg-black text-yellow-400 font-black text-xl px-10 py-5 rounded-2xl hover:bg-zinc-900 transition-all shadow-2xl">
        Garantir Minha Vaga
      </a>
    </div>
  </section>

  <footer class="bg-black text-zinc-500 py-8">
    <div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-yellow-400 font-black">${data.companyName}</p>
      <p class="text-sm">${data.address} · ${data.phone}</p>
    </div>
  </footer>

</body>
</html>`;
}

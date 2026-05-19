import type { TemplateData } from "../../../types/template.types.js";

export function renderComercioTemplate(data: TemplateData): string {
  const services = data.services
    .map(
      (s) => `
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
        <div class="text-3xl mb-4">${s.icon}</div>
        <h3 class="text-slate-800 font-bold text-base mb-2 group-hover:text-indigo-600 transition-colors">${s.name}</h3>
        <p class="text-slate-500 text-sm leading-relaxed">${s.description}</p>
      </div>`
    )
    .join("");

  const differentials = data.differentials
    .map(
      (d) => `
      <div class="flex items-center gap-3 bg-indigo-50 rounded-xl px-5 py-3">
        <span class="text-indigo-500 text-lg">✓</span>
        <span class="text-slate-700 text-sm font-medium">${d}</span>
      </div>`
    )
    .join("");

  const whatsappUrl = `https://wa.me/55${data.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(data.whatsappMessage)}`;

  const instagramLink = data.instagram
    ? `<a href="https://instagram.com/${data.instagram.replace("@", "")}" target="_blank"
         class="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-500 text-sm transition-colors">
         <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
         @${data.instagram}
       </a>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.companyName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .hero-bg { background: linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #f0f4ff 100%); }
    .logo-ring { box-shadow: 0 0 0 6px rgba(99,102,241,0.08), 0 0 0 12px rgba(99,102,241,0.04); }
    .whatsapp-pulse { animation: wpulse 2s infinite; }
    @keyframes wpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.35); } 70% { box-shadow: 0 0 0 14px rgba(37,211,102,0); } }
    .badge { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
  </style>
</head>
<body class="bg-slate-50 text-slate-800">

  <!-- HERO — Logo em destaque -->
  <section class="hero-bg min-h-screen flex flex-col justify-center relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-1 badge opacity-80"></div>
    <div class="container mx-auto px-6 py-20 relative z-10">
      <div class="max-w-2xl mx-auto text-center">

        <!-- LOGO — elemento principal -->
        ${data.logoUrl
          ? `<div class="mb-8 flex justify-center">
               <div class="w-32 h-32 rounded-3xl overflow-hidden logo-ring bg-white shadow-lg flex items-center justify-center">
                 <img src="${data.logoUrl}" alt="Logo ${data.companyName}" class="w-full h-full object-contain p-3" />
               </div>
             </div>`
          : `<div class="mb-8 flex justify-center">
               <div class="w-32 h-32 rounded-3xl bg-indigo-600 shadow-lg logo-ring flex items-center justify-center">
                 <span class="text-white font-black text-4xl">${data.companyName.charAt(0).toUpperCase()}</span>
               </div>
             </div>`
        }

        <div class="inline-flex items-center gap-2 badge text-white rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm shadow-indigo-200">
          📍 ${data.city}
        </div>

        <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
          ${data.heroHeadline}
        </h1>
        <p class="text-slate-500 text-lg leading-relaxed mb-10 max-w-lg mx-auto">${data.heroSubtitle}</p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="${whatsappUrl}" target="_blank"
             class="whatsapp-pulse inline-flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold text-base px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-green-200">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
            ${data.ctaText}
          </a>
          <a href="tel:${data.phone.replace(/\D/g, "")}"
             class="inline-flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-medium text-base px-8 py-4 rounded-2xl border border-slate-200 transition-all duration-300 shadow-sm">
            <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>
            ${data.phone}
          </a>
        </div>

        ${instagramLink ? `<div class="mt-6">${instagramLink}</div>` : ""}
      </div>
    </div>
  </section>

  <!-- PRODUTOS / SERVIÇOS -->
  <section class="bg-white py-24 border-t border-slate-100">
    <div class="container mx-auto px-6">
      <div class="text-center mb-14">
        <span class="text-indigo-500 font-semibold text-xs uppercase tracking-[0.2em]">O que oferecemos</span>
        <h2 class="text-3xl font-extrabold mt-2 text-slate-900">Nossos <span class="text-indigo-600">Produtos e Serviços</span></h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        ${services}
      </div>
    </div>
  </section>

  <!-- POR QUE NOS ESCOLHER -->
  <section class="bg-slate-50 py-24 border-t border-slate-100">
    <div class="container mx-auto px-6">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-12">
          <span class="text-indigo-500 font-semibold text-xs uppercase tracking-[0.2em]">Nossos diferenciais</span>
          <h2 class="text-3xl font-extrabold mt-2 text-slate-900">Por que escolher a <span class="text-indigo-600">${data.companyName}</span></h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${differentials}
        </div>
        ${data.rating ? `
        <div class="mt-10 text-center">
          <span class="text-slate-500 text-sm">Avaliação no Google</span>
          <div class="text-5xl font-black text-indigo-600 mt-1">${data.rating.toFixed(1)} ★</div>
          ${data.reviewCount ? `<span class="text-slate-400 text-xs">${data.reviewCount} avaliações verificadas</span>` : ""}
        </div>` : ""}
      </div>
    </div>
  </section>

  <!-- CTA FINAL -->
  <section class="badge py-20">
    <div class="container mx-auto px-6 text-center">
      ${data.logoUrl
        ? `<div class="mb-6 flex justify-center">
             <div class="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 backdrop-blur flex items-center justify-center shadow-lg">
               <img src="${data.logoUrl}" alt="${data.companyName}" class="w-full h-full object-contain p-2" />
             </div>
           </div>`
        : ""
      }
      <h2 class="text-3xl font-extrabold text-white mb-3">${data.companyName}</h2>
      <p class="text-indigo-200 mb-8 max-w-sm mx-auto">${data.address}</p>
      <a href="${whatsappUrl}" target="_blank"
         class="inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all duration-300 shadow-xl shadow-black/20">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.36c-.833 1.246-2.064 2.1-3.468 2.426a9.9 9.9 0 01-2.426.307c-1.73 0-3.423-.447-4.916-1.306L2 20l1.22-5.03A9.868 9.868 0 012.1 12C2.1 6.545 6.545 2.1 12 2.1S21.9 6.545 21.9 12a9.87 9.87 0 01-4.006 5.36z"/></svg>
        Falar pelo WhatsApp
      </a>
    </div>
  </section>

  <!-- RODAPÉ -->
  <footer class="bg-slate-900 py-8">
    <div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3">
      <div class="flex items-center gap-3">
        ${data.logoUrl
          ? `<img src="${data.logoUrl}" alt="${data.companyName}" class="h-8 w-auto object-contain opacity-80" />`
          : `<span class="text-white font-bold">${data.companyName}</span>`
        }
        <span class="text-slate-400 text-sm">${data.address}</span>
      </div>
      <p class="text-slate-500 text-sm">${data.phone}</p>
    </div>
  </footer>

</body>
</html>`;
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function toWhatsAppJid(phone: string): string {
  const digits = normalizePhone(phone);
  // Garante código de país BR
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `${withCountry}@s.whatsapp.net`;
}

export function formatBrazilianPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export function isValidBrazilianPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  // Com código de país: 55 + DDD (2) + número (8 ou 9) = 12 ou 13
  // Sem código de país: DDD (2) + número (8 ou 9) = 10 ou 11
  return [10, 11, 12, 13].includes(digits.length);
}

export function extractPossibleWhatsApp(phone: string | null): string | null {
  if (!phone) return null;
  const digits = normalizePhone(phone);
  if (!isValidBrazilianPhone(digits)) return null;
  // Celulares brasileiros têm 9 como 3° dígito (após DDD) no formato sem código país
  const withoutCountry = digits.startsWith("55") ? digits.slice(2) : digits;
  // Se 9 dígitos locais e começa com 9, é celular
  if (withoutCountry.length === 11 && withoutCountry[2] === "9") return digits;
  if (withoutCountry.length === 9 && withoutCountry[0] === "9") return digits;
  return null;
}

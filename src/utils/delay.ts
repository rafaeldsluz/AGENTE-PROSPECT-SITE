export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return sleep(ms);
}

export function humanizedDelay(): Promise<void> {
  // Simula tempo humano de leitura/digitação: 1.5s a 4s
  return randomDelay(1_500, 4_000);
}

export function betweenActionsDelay(): Promise<void> {
  // Delay entre ações de scraping: 2s a 8s
  return randomDelay(2_000, 8_000);
}

export function betweenPagesDelay(): Promise<void> {
  // Delay entre páginas do Google Maps: 5s a 15s
  return randomDelay(5_000, 15_000);
}

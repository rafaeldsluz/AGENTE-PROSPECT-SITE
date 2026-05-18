export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return sleep(ms);
}

export function humanizedDelay(): Promise<void> {
  return randomDelay(800, 2_500);
}

export function betweenActionsDelay(): Promise<void> {
  // Delay entre ações de scraping: era 2-8s, agora 800ms-2.5s
  return randomDelay(800, 2_500);
}

export function betweenPagesDelay(): Promise<void> {
  // Delay entre páginas do Google Maps: era 5-15s, agora 2-5s
  return randomDelay(2_000, 5_000);
}

// Controle de janela de disparo e override manual.
// Brasil (São Paulo) é fixo em UTC-3 desde 2019 (sem horário de verão).
// Janela padrão: 08:00–18:00 BRT = 11:00–21:00 UTC.

let _manualOverride = false;

function getBRTHour(): number {
  // São Paulo = UTC-3, sem DST desde 2019
  return (new Date().getUTCHours() + 21) % 24; // +21 = -3 mod 24
}

export function isWithinDispatchWindow(
  startHour = 8,
  endHour = 18,
): boolean {
  const h = getBRTHour();
  return h >= startHour && h < endHour;
}

export function msUntilWindowOpens(startHour = 8): number {
  const now = new Date();
  const utcNow = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  // startHour BRT → UTC
  const startUTC = ((startHour + 3) % 24) * 3600;

  let secsUntil = startUTC - utcNow;
  if (secsUntil <= 0) secsUntil += 86_400; // próximo dia
  return secsUntil * 1_000;
}

export function nextWindowOpenISO(startHour = 8): string {
  const ms = msUntilWindowOpens(startHour);
  return new Date(Date.now() + ms).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
}

export function isManualOverrideActive(): boolean {
  return _manualOverride;
}

export function setManualOverride(value: boolean): void {
  _manualOverride = value;
}

export function getDispatchStatus(startHour = 8, endHour = 18) {
  const withinWindow = isWithinDispatchWindow(startHour, endHour);
  const manualOverride = _manualOverride;
  const canDispatch = withinWindow || manualOverride;
  const brtHour = getBRTHour();
  return {
    withinWindow,
    manualOverride,
    canDispatch,
    currentHourBRT: brtHour,
    windowStart: startHour,
    windowEnd: endHour,
    nextWindowOpen: canDispatch ? null : nextWindowOpenISO(startHour),
  };
}

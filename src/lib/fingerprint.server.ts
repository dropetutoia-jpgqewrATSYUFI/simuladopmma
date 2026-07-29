import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Gera uma "impressão digital" estável do dispositivo/rede a partir de dados
 * da própria requisição (IP + navegador). Como nada disso fica no navegador,
 * o usuário continua sendo reconhecido mesmo que limpe cookies/localStorage.
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  try {
    const forwarded = getRequestHeader("x-forwarded-for") ?? "";
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-real-ip") ??
      forwarded.split(",")[0]?.trim() ??
      "";
    const userAgent = getRequestHeader("user-agent") ?? "";
    const language = getRequestHeader("accept-language")?.split(",")[0] ?? "";
    const platform = getRequestHeader("sec-ch-ua-platform") ?? "";

    const raw = `${ip}|${userAgent}|${language}|${platform}`.trim();
    if (!ip && !userAgent) return null;

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 48);
  } catch {
    return null;
  }
}

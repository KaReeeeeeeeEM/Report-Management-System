type SessionPayload = {
  email?: string;
  name?: string;
  exp?: number;
};

function decodeBase64UrlSegment(segment: string) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const base64 = `${normalized}${padding}`;

  try {
    return decodeURIComponent(
      Array.from(atob(base64), (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
    );
  } catch {
    return null;
  }
}

export function readSessionPayload(token: string): SessionPayload | null {
  const [, payloadSegment] = token.split(".");

  if (!payloadSegment) {
    return null;
  }

  const payloadJson = decodeBase64UrlSegment(payloadSegment);

  if (!payloadJson) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadJson) as SessionPayload;

    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

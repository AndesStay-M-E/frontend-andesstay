export interface AndesStayAccessTokenClaims {
  roles?: string[];
  scp?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
}

export function decodeAccessToken(
  token: string,
): AndesStayAccessTokenClaims | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];

    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(base64Url.length / 4) * 4, '=');

    const binary = atob(base64);

    const bytes = Uint8Array.from(
      binary,
      (character) => character.charCodeAt(0),
    );

    const json = new TextDecoder().decode(bytes);

    return JSON.parse(json) as AndesStayAccessTokenClaims;
  } catch (error) {
    console.error('No fue posible leer el access token:', error);
    return null;
  }
}
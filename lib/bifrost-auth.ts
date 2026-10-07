import type { BifrostClient } from "@/lib/bifrost-client";
import { bifrostConfig, browserBifrostConfig } from "@/lib/bifrost-config";

const SESSION_KEY = "gsc-bifrost-session-v1";
export const BIFROST_STORAGE_KEYS = {
  accessToken: "gsc_accessToken",
  refreshToken: "gsc_refreshToken",
  sessionId: "gsc_sessionId",
} as const;

type Session = {
  accessToken: string;
  refreshToken: string | null;
  sessionId: string | null;
  clientId: string;
  phone: string;
  expiresAt: number;
};

export type OtpFlow = {
  client: BifrostClient;
  flowToken: string;
  codeVerifier: string;
  phone: string;
};

async function createClient() {
  const { BifrostClient } = await import("@/lib/bifrost-client");
  return new BifrostClient(browserBifrostConfig());
}

function saveSession(data: Record<string, unknown>, phone: string): Session {
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new Error("Could not complete sign in. Please request a new code.");
  }
  const expiresIn = Number(data.expires_in);
  const session: Session = {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
    sessionId: typeof data.session_id === "string" ? data.session_id : null,
    clientId: bifrostConfig.clientId,
    phone,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(BIFROST_STORAGE_KEYS.accessToken, session.accessToken);
  for (const key of ["refreshToken", "sessionId"] as const) {
    const value = session[key];
    if (value) localStorage.setItem(BIFROST_STORAGE_KEYS[key], value);
    else localStorage.removeItem(BIFROST_STORAGE_KEYS[key]);
  }
  return session;
}

/** Start PKCE and send a phone OTP, using the same headless flow as verify-portal-ui. */
export async function sendOtp(phone: string) {
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Enter a valid 10-digit Indian mobile number.");
  const client = await createClient();
  const { codeChallenge, codeVerifier } = await client.generatePKCES256();
  const started = await client.startLoginFlow({
    codeChallenge,
    redirectUri: client.getRedirectUri(),
    state: { deviceId: client.getDeviceId(), clientId: client.getClientId(), redirectUri: client.getRedirectUri() },
  });
  if (!started.success || !started.data?.flow_token) throw new Error(started.message || "Could not start verification.");
  const flow: OtpFlow = { client, flowToken: started.data.flow_token, codeVerifier, phone };
  const sent = await client.sendOtp({
    flowToken: flow.flowToken,
    methodId: bifrostConfig.methodId,
    identifier: `${bifrostConfig.countryCode}${phone}`,
  });
  if (!sent.success) throw new Error(sent.message || "Could not send the OTP.");
  return { flow, length: bifrostConfig.otpLength, retryAfter: bifrostConfig.otpRetrySeconds };
}

/** Exchange the verified code with the original PKCE verifier and persist the returned token. */
export async function exchangeCodeForToken(flow: OtpFlow, code: string) {
  if (!code) throw new Error("Could not verify the code. Please request a new one.");
  const result = await flow.client.exchangeCodeForTokens({
    code,
    redirectUri: flow.client.getRedirectUri(),
    codeVerifier: flow.codeVerifier,
    sessionInfo: { platform: "WEB", loginMethod: bifrostConfig.methodId },
  });
  if (result.success === false) throw new Error(result.message || "Could not complete sign in.");
  return saveSession(result.data || result, flow.phone);
}

/** Verification may return JSON directly or fetch the configured callback with a code. */
export async function verifyOtp(flow: OtpFlow, code: string) {
  const verified = await flow.client.verifyOtpAndGetCode({
    flowToken: flow.flowToken,
    methodId: bifrostConfig.methodId,
    identifier: `${bifrostConfig.countryCode}${flow.phone}`,
    code,
  });
  return exchangeCodeForToken(flow, verified.code);
}

export async function resendOtp(flow: OtpFlow) {
  const sent = await flow.client.sendOtp({
    flowToken: flow.flowToken,
    methodId: bifrostConfig.methodId,
    identifier: `${bifrostConfig.countryCode}${flow.phone}`,
    resend_otp: true,
  });
  if (!sent.success) throw new Error(sent.message || "Could not resend the OTP.");
  return { length: bifrostConfig.otpLength, retryAfter: bifrostConfig.otpRetrySeconds };
}

/** Open registration from a saved access token without making an auth API call. */
export function restoreBifrostSession(): Pick<Session, "accessToken" | "phone"> | null {
  try {
    const accessToken = localStorage.getItem(BIFROST_STORAGE_KEYS.accessToken);
    if (!accessToken) return null;
    let phone = "";
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (session?.accessToken === accessToken && typeof session.phone === "string") phone = session.phone;
    } catch { /* A missing or malformed phone record does not block a saved token. */ }
    return { accessToken, phone };
  } catch {
    return null;
  }
}

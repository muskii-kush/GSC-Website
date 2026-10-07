/**
 * Headless OTP methods adapted from omniauth/src/components/flows/bifrost/bifrost.ts.
 * Keep the Bifrost wire format here so registration does not need the Omniauth SDK.
 */
type ClientConfig = {
  authApiBaseUrl: string;
  clientId: string;
  deviceId: string;
  redirectUri: string;
};

type StartLoginFlowParams = {
  codeChallengeMethod?: string;
  codeChallenge: string;
  redirectUri: string;
  state: string | number | Record<string, unknown>;
};

type StartLoginFlowResponse = {
  success: boolean;
  message?: string;
  data?: { flow_token: string };
};

type SendOtpRequest = {
  flowToken: string;
  methodId: "PHONE_OTP";
  identifier: string;
  resend_otp?: boolean;
};

type SendOtpResponse = {
  success: boolean;
  message?: string;
  data?: { otp_len?: number; retry_after_sec?: number };
};

type VerifyOtpRequest = SendOtpRequest & {
  code: string;
  metadata?: { user_address_consent?: boolean; whatsapp_consent?: boolean };
};

type CodeExchangeRequest = {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  sessionInfo: Record<string, unknown>;
};

type CodeExchangeResponse = Record<string, unknown> & {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

type ApiErrorResponse = { error_code: string; error: string };

export class BifrostApiError extends Error {
  constructor(public readonly response: ApiErrorResponse, public readonly statusCode: number) {
    super(response.error);
    this.name = "BifrostApiError";
  }

  get errorMessage() { return this.response.error; }
  get errorCode() { return this.response.error_code; }
}

const DEFAULT_OTP_LENGTH = 4;
const DEFAULT_OTP_RETRY = 30;
const TOKEN_EXCHANGE_ERRORS: Record<string, string> = {
  AS_FB_01: "Device is blocked. Please contact support or try a different device.",
  AS_FB_02: "Session is blocked. Please start a new login session.",
  AS_FB_04: "Device limit exceeded. Please remove some devices from your account or contact support.",
  AS_FB_05: "User account is blocked. Please contact support for assistance.",
  AS_FB_06: "Device ID mismatch. Please ensure you're using the correct device.",
};

export class BifrostClient {
  private otpLength = DEFAULT_OTP_LENGTH;
  private otpRetry = DEFAULT_OTP_RETRY;
  private pendingOtpSends = new Map<string, Promise<SendOtpResponse>>();

  constructor(private readonly config: ClientConfig) {}

  getClientId() { return this.config.clientId; }
  getDeviceId() { return this.config.deviceId; }
  getRedirectUri() { return this.config.redirectUri; }
  getOtpLength() { return this.otpLength; }
  getOtpRetry() { return this.otpRetry; }

  async generatePKCES256() {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const codeVerifier = base64Url(array);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
    return { codeVerifier, codeChallenge: base64Url(new Uint8Array(digest)) };
  }

  async startLoginFlow(params: StartLoginFlowParams): Promise<StartLoginFlowResponse> {
    const { codeChallengeMethod = "S256", codeChallenge, redirectUri, state } = params;
    const urlParams = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      state: typeof state === "string" ? state : JSON.stringify(state),
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      device_id: this.config.deviceId,
    });
    try {
      const response = await fetch(`${this.config.authApiBaseUrl}/oauth2/auth?${urlParams}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch {
      throw new Error("Something went wrong to start login flow");
    }
  }

  async sendOtp(body: SendOtpRequest): Promise<SendOtpResponse> {
    const { flowToken, methodId, identifier, resend_otp } = body;
    const { authApiBaseUrl, clientId, deviceId } = this.config;
    const key = JSON.stringify([authApiBaseUrl, clientId, deviceId, flowToken, methodId, identifier, Boolean(resend_otp)]);
    const existing = this.pendingOtpSends.get(key);
    if (existing) return existing;
    const pending = Promise.resolve().then(async () => {
      try {
        const response = await fetch(`${authApiBaseUrl}/oauth2/otp/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-device-id": deviceId, "x-client-id": clientId },
          credentials: "include",
          body: JSON.stringify({
            flow_token: flowToken,
            method_id: methodId,
            identifier,
            ...(resend_otp && { resend_otp: true }),
          }),
        });
        if (!response.ok) throw await this.handleApiError(response);
        const data: SendOtpResponse = await response.json();
        this.otpLength = data?.data?.otp_len || DEFAULT_OTP_LENGTH;
        this.otpRetry = data?.data?.retry_after_sec || DEFAULT_OTP_RETRY;
        return data;
      } catch (error) {
        if (error instanceof BifrostApiError) throw error;
        throw new Error(`Failed to send OTP: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }).finally(() => {
      if (this.pendingOtpSends.get(key) === pending) this.pendingOtpSends.delete(key);
    });
    this.pendingOtpSends.set(key, pending);
    return pending;
  }

  async verifyOtpAndGetCode(body: VerifyOtpRequest): Promise<{ code: string; state: string }> {
    const { flowToken, methodId, identifier, code, resend_otp, metadata } = body;
    const response = await fetch(`${this.config.authApiBaseUrl}/oauth2/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": this.config.deviceId,
        "x-client-id": this.config.clientId,
      },
      credentials: "include",
      mode: "cors",
      body: JSON.stringify({
        flow_token: flowToken,
        method_id: methodId,
        identifier,
        code,
        ...(resend_otp && { resend_otp: true }),
        ...(metadata && { metadata }),
      }),
    });
    if (!response.ok) throw await this.handleApiError(response);
    const data = await response.json();
    return { code: data?.data?.code, state: data?.data?.state };
  }

  async exchangeCodeForTokens(params: CodeExchangeRequest): Promise<CodeExchangeResponse> {
    const { code, redirectUri, codeVerifier, sessionInfo } = params;
    try {
      const response = await fetch(`${this.config.authApiBaseUrl}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-device-id": this.config.deviceId },
        credentials: "include",
        mode: "cors",
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: this.config.clientId,
          code_verifier: codeVerifier,
          session_info: sessionInfo,
        }),
      });
      if (!response.ok) {
        const error = await this.handleApiError(response);
        const errorCode = error.errorCode;
        if (!errorCode.startsWith("HTTP_")) {
          throw new Error(`${TOKEN_EXCHANGE_ERRORS[errorCode] || `Authentication error: ${errorCode}`} (Code: ${errorCode})`);
        }
        throw error;
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes("Code:")) throw error;
      throw new Error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async handleApiError(response: Response): Promise<BifrostApiError> {
    // Read once so a non-JSON error can still be shown after JSON parsing fails.
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return new BifrostApiError({
        error_code: typeof data.error_code === "string" ? data.error_code : `HTTP_${response.status}`,
        error: typeof data.error === "string" ? data.error : data.message || `HTTP error: ${response.status}`,
      }, response.status);
    } catch {
      return new BifrostApiError({ error_code: `HTTP_${response.status}`, error: text || `HTTP error: ${response.status}` }, response.status);
    }
  }
}

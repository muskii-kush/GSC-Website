import "server-only";

// SMS delivery for OTPs. Only the mock provider exists today; add a real one
// (Twilio Verify, MSG91, …) by implementing SmsProvider and selecting it with SMS_PROVIDER.

export interface SmsProvider {
  name: string;
  sendOtp(phone: string, code: string): Promise<void>;
}

const mock: SmsProvider = {
  name: "mock",
  async sendOtp(phone, code) {
    console.info(`[sms:mock] OTP for ${phone}: ${code}`);
  },
};

export function smsProvider(): SmsProvider {
  const name = process.env.SMS_PROVIDER || "mock";
  if (name === "mock") return mock;
  throw new Error(`Unknown SMS_PROVIDER "${name}"`);
}

// The mock provider can echo the code back to the browser so the flow can be
// tested without SMS. Never enabled in production unless explicitly allowed.
export function shouldEchoOtp(provider: SmsProvider): boolean {
  if (provider.name !== "mock") return false;
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_OTP_ECHO === "true";
}

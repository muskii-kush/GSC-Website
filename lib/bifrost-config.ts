/** Public Bifrost settings for the registration OTP flow. */
export const bifrostConfig = {
  authApiBaseUrl: "https://auth-service-stage.qac24svc.dev",
  redirectUri: "https://gsc.cars24.com",
  clientId: "client_4oBqpbGsDOaHJ_pxcvIlNA",
  methodId: "PHONE_OTP" as const,
  countryCode: "+91",
  otpLength: 6,
  otpRetrySeconds: 30,
};

const DEVICE_KEY = "gsc-bifrost-device-id";

export function browserBifrostConfig() {
  if (!bifrostConfig.authApiBaseUrl || !bifrostConfig.clientId || !bifrostConfig.redirectUri) {
    throw new Error("Phone verification is not configured yet. Please try again later.");
  }

  let deviceId = window.localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = `device-${window.crypto.randomUUID()}`;
    window.localStorage.setItem(DEVICE_KEY, deviceId);
  }

  return {
    authApiBaseUrl: bifrostConfig.authApiBaseUrl,
    clientId: bifrostConfig.clientId,
    redirectUri: bifrostConfig.redirectUri,
    deviceId,
  };
}

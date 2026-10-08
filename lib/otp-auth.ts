const OTP_API_URL = "https://api.cars24.com/gw/plt/bffsvc/api/v1/otp";
type ApiResponse = {
  success?: boolean;
  verified?: boolean;
  message?: string;
  error?: string | { message?: string };
};

function identifier(phone: string) {
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Enter a valid 10-digit Indian mobile number.");
  return `+91${phone}`;
}

async function postOtp(path: "generate" | "verify", body: { identifier: string; otp?: string }): Promise<ApiResponse> {
  const response = await fetch(`${OTP_API_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let result: ApiResponse;
  try {
    result = await response.json();
  } catch {
    throw new Error("Could not read the verification response. Please try again.");
  }
  if (!response.ok || !result || result.success === false) {
    const error = typeof result?.error === "string" ? result.error : result?.error?.message;
    throw new Error(error || result?.message || (path === "generate" ? "Could not send the OTP." : "Could not verify the OTP."));
  }
  return result;
}

/** Generate a code for both the initial send and retries. */
export async function requestOtp(phone: string) {
  await postOtp("generate", { identifier: identifier(phone) });
}

/** Verify the code directly with the BFF; no OAuth flow or code exchange. */
export async function verifyPhoneOtp(phone: string, otp: string) {
  const response = await postOtp("verify", { identifier: identifier(phone), otp });
  if (response.verified !== true) {
    throw new Error(response.message || "Could not verify the OTP. Please check the code and try again.");
  }
}

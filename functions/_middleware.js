import { bifrostCallbackResponse } from "../lib/bifrost-callback";
import { bifrostConfig } from "../lib/bifrost-config";

export function onRequest(context) {
  return bifrostCallbackResponse(
    context.request,
    bifrostConfig.redirectUri,
    bifrostConfig.authApiBaseUrl,
  ) || context.next();
}

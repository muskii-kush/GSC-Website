import { NextResponse, type NextRequest } from "next/server";
import { bifrostCallbackResponse } from "@/lib/bifrost-callback";
import { bifrostConfig } from "@/lib/bifrost-config";

export function middleware(request: NextRequest) {
  return bifrostCallbackResponse(
    request,
    bifrostConfig.redirectUri,
    bifrostConfig.authApiBaseUrl,
  ) || NextResponse.next();
}

export const config = { matcher: "/" };

import { NextResponse } from "next/server";
import crypto from "crypto";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        requestId,
      },
    },
    { status }
  );
}

import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface AccessTokenPayload {
  userId: string;
  organizationId: string;
  role: string;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    { ...payload, type: "ACCESS" },
    process.env.ACCESS_TOKEN_SECRET || "fallback_access_secret",
    { expiresIn: "15m" }
  );
}

export function generateRefreshToken() {
  const rawRefreshToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(rawRefreshToken)
    .digest("hex");

  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);

  return {
    rawRefreshToken,
    tokenHash,
    refreshExpiry,
  };
}

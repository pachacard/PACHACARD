// lib/token.ts
import * as jose from "jose";

const currentSecretValue =
  process.env.QR_JWT_SECRET_CURRENT || process.env.QR_JWT_SECRET || "devsecret";
const previousSecretValue = process.env.QR_JWT_SECRET_PREVIOUS || "";

const currentSecret = new TextEncoder().encode(currentSecretValue);
const previousSecret = previousSecretValue
  ? new TextEncoder().encode(previousSecretValue)
  : null;

export async function makeCardToken(userId: string, tokenVersion = 1) {
  return new jose.SignJWT({
    sub: userId,
    kind: "card",
    tv: tokenVersion,
  })
    .setProtectedHeader({
      alg: "HS256",
      kid: process.env.QR_JWT_KID || "current",
    })
    .sign(currentSecret);
}

export async function verifyQrToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, currentSecret, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (e) {
    if (!previousSecret) throw e;

    const { payload } = await jose.jwtVerify(token, previousSecret, {
      algorithms: ["HS256"],
    });
    return payload;
  }
}

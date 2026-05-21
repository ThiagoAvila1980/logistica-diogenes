import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored?.startsWith("scrypt:")) return false;
  const [, salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;

  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const keyBuf = Buffer.from(keyHex, "hex");
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, keyBuf);
}

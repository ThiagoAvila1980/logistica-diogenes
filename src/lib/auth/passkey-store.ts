import { eq } from "drizzle-orm";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { useMockData } from "@/lib/data/config";
import { userPasskeys } from "@/db/schema";

export type StoredPasskey = {
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  userId: string;
};

const mockPasskeys = new Map<string, StoredPasskey[]>();

function toStored(row: typeof userPasskeys.$inferSelect): StoredPasskey {
  return {
    userId: row.userId,
    credentialId: row.credentialId,
    publicKey: Uint8Array.from(Buffer.from(row.publicKey, "base64")),
    counter: row.counter,
    transports: row.transports as StoredPasskey["transports"],
  };
}

export async function listPasskeysForUser(
  userId: string,
): Promise<StoredPasskey[]> {
  if (useMockData()) {
    return mockPasskeys.get(userId) ?? [];
  }

  const { getDb } = await import("@/db");
  const db = getDb();
  const rows = await db
    .select()
    .from(userPasskeys)
    .where(eq(userPasskeys.userId, userId));

  return rows.map(toStored);
}

export async function findPasskeyByCredentialId(
  credentialId: string,
): Promise<StoredPasskey | null> {
  if (useMockData()) {
    for (const list of mockPasskeys.values()) {
      const found = list.find((p) => p.credentialId === credentialId);
      if (found) return found;
    }
    return null;
  }

  const { getDb } = await import("@/db");
  const db = getDb();
  const [row] = await db
    .select()
    .from(userPasskeys)
    .where(eq(userPasskeys.credentialId, credentialId))
    .limit(1);

  return row ? toStored(row) : null;
}

export async function savePasskey(
  userId: string,
  passkey: Omit<StoredPasskey, "userId">,
): Promise<void> {
  if (useMockData()) {
    const list = mockPasskeys.get(userId) ?? [];
    list.push({ ...passkey, userId });
    mockPasskeys.set(userId, list);
    return;
  }

  const { getDb } = await import("@/db");
  const db = getDb();
  await db.insert(userPasskeys).values({
    userId,
    credentialId: passkey.credentialId,
    publicKey: Buffer.from(passkey.publicKey).toString("base64"),
    counter: passkey.counter,
    transports: passkey.transports ?? null,
  });
}

export async function updatePasskeyCounter(
  credentialId: string,
  counter: number,
): Promise<void> {
  if (useMockData()) {
    for (const list of mockPasskeys.values()) {
      const found = list.find((p) => p.credentialId === credentialId);
      if (found) {
        found.counter = counter;
        return;
      }
    }
    return;
  }

  const { getDb } = await import("@/db");
  const db = getDb();
  await db
    .update(userPasskeys)
    .set({ counter, lastUsedAt: new Date() })
    .where(eq(userPasskeys.credentialId, credentialId));
}

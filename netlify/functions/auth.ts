import type { Config } from "@netlify/functions";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { sessions, users } from "../../db/schema.js";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const MIN_PASSWORD = 8;

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const key = await scryptAsync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

const error = (message: string, status = 400) => Response.json({ error: message }, { status });
const publicUser = (u: { id: number; username: string }) => ({ id: u.id, username: u.username });

async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({ token, userId });
  return token;
}

async function userFromRequest(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token));
  return row ?? null;
}

export default async (req: Request) => {
  if (req.method !== "POST") return error("Method not allowed", 405);
  const action = new URL(req.url).pathname.split("/").pop();
  const body = await req.json().catch(() => ({}));

  if (action === "register") {
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!/^[a-z0-9_.]{3,30}$/.test(username))
      return error("Username must be 3–30 letters, numbers, dots or underscores");
    if (password.length < MIN_PASSWORD) return error(`Password must be at least ${MIN_PASSWORD} characters`);
    if (password !== body.confirmPassword) return error("Passwords do not match");
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
    if (existing) return error("That username is already taken", 409);
    const [user] = await db
      .insert(users)
      .values({ username, passwordHash: await hashPassword(password) })
      .returning();
    return Response.json({ token: await createSession(user.id), user: publicUser(user) }, { status: 201 });
  }

  if (action === "login") {
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!username || !password) return error("Enter username and password");
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      return error("Incorrect username or password", 401);
    return Response.json({ token: await createSession(user.id), user: publicUser(user) });
  }

  if (action === "change-password") {
    const user = await userFromRequest(req);
    if (!user) return error("Please log in again", 401);
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    if (!(await verifyPassword(currentPassword, user.passwordHash))) return error("Current password is incorrect", 401);
    if (newPassword.length < MIN_PASSWORD) return error(`New password must be at least ${MIN_PASSWORD} characters`);
    if (newPassword !== body.confirmPassword) return error("New passwords do not match");
    if (newPassword === currentPassword) return error("New password must be different from the current one");
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    // Sign out every other device, keep this one with a fresh session.
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    return Response.json({ token: await createSession(user.id), user: publicUser(user) });
  }

  if (action === "logout") {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
    return Response.json({ ok: true });
  }

  return error("Not found", 404);
};

export const config: Config = {
  path: ["/api/auth/register", "/api/auth/login", "/api/auth/change-password", "/api/auth/logout"],
};

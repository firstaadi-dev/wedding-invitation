import pg from "pg";
import { spawn } from "node:child_process";
export const binary =
  process.env.BACKEND_BINARY ||
  new URL("../../.local/invitation", import.meta.url).pathname;
export function command(args, env = {}, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(output) : reject(new Error(output)),
    );
    child.stdin.end(input);
  });
}
export function database(connectionString) {
  const url = new URL(connectionString);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    url.searchParams.set("sslmode", "verify-full");
  return new pg.Pool({
    connectionString: url.toString(),
    max: 5,
    connectionTimeoutMillis: 15000,
  });
}
export async function migrate(
  connectionString,
  schema = "wedding",
  passwordHash = process.env.ADMIN_PASSWORD_HASH,
) {
  await command(["migrate"], {
    DATABASE_URL_UNPOOLED: connectionString,
    DB_SCHEMA: schema,
    ADMIN_PASSWORD_HASH: passwordHash || "",
  });
}
export async function provisionAccount(_client, value, passwordHash) {
  await command(
    ["provision"],
    {
      DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL_UNPOOLED,
      PROVISION_PASSWORD_HASH: passwordHash || "",
    },
    JSON.stringify(value),
  );
}

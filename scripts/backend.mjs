import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
for (const file of [".env", ".env.local"])
  if (existsSync(file)) process.loadEnvFile(file);
const build = spawnSync(
  "go",
  ["-C", "backend", "build", "-o", "../.local/invitation", "./cmd/invitation"],
  { stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status || 1);
const child = spawn(".local/invitation", process.argv.slice(2), {
  env: process.env,
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});

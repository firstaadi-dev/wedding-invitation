import { spawnSync } from "node:child_process";
for (const [command, args] of [
  ["npm", ["run", "build", "--prefix", "frontend"]],
  [
    "go",
    [
      "-C",
      "backend",
      "build",
      "-trimpath",
      "-o",
      "../.local/invitation",
      "./cmd/invitation",
    ],
  ],
]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

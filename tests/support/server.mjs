import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { binary } from "./db.mjs";
export async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
function ready(child, pattern) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Startup timed out: ${output}`));
    }, 30000);
    const data = (chunk) => {
      output += chunk;
      const match = output.match(pattern);
      if (match) {
        clearTimeout(timer);
        resolve(match);
      }
    };
    child.stdout.on("data", data);
    child.stderr.on("data", data);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Startup exited ${code}: ${output}`));
    });
  });
}
export async function startBackend({ origin, cmsOrigin=origin, endpoint }) {
  const port = await freePort();
  const simPort = await freePort();
  const simulation = spawn(
    "postman",
    [
      "simulation",
      "run",
      "postman/simulations/verification.sim.yaml",
      "--port",
      String(simPort),
      "--output",
      "ndjson",
      "--no-history",
    ],
    { detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  let log = "";
  simulation.stdout.on("data", (chunk) => {
    log += chunk;
  });
  simulation.stderr.on("data", (chunk) => {
    log += chunk;
  });
  const stopSimulation = () => {
    try {
      process.kill(-simulation.pid, "SIGINT");
    } catch {}
  };
  try {
    await ready(
      simulation,
      /"type":"listening"|"event":"listening"|"listening"/,
    );
    const fingerprintOrigin = `http://127.0.0.1:${simPort}/fingerprint`;
    // Initialize Postman state before parallel verification (CLI 1.73 first-use table creation races).
    const warmup = await fetch(`${fingerprintOrigin}/__fixtures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: "warmup" }),
    });
    if (!warmup.ok) throw new Error("Fingerprint fixture failed to initialize");
    const child = spawn(binary, ["serve"], {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL,
        PORT: String(port),
        PUBLIC_ORIGIN: origin,
        CMS_ORIGIN: cmsOrigin,
        NODE_ENV: "production",
        TRUST_PROXY: "0",
        FINGERPRINT_PUBLIC_KEY: "test",
        FINGERPRINT_SECRET_KEY: "test",
        FINGERPRINT_REGION: "ap",
        FINGERPRINT_ENDPOINT: endpoint,
        FINGERPRINT_API_ORIGIN: fingerprintOrigin,
        TEMPLATE_DIR: "frontend/dist",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await ready(child, /Invitation server ready/);
    return {
      base: `http://127.0.0.1:${port}`,
      events: {
        async set(_id, event) {
          const response = await fetch(`${fingerprintOrigin}/__fixtures`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event),
          });
          if (!response.ok)
            throw new Error(
              `Fixture rejected: ${response.status} ${await response.text()}`,
            );
        },
      },
      server: {
        async close() {
          const closed = once(child, "close");
          child.kill("SIGTERM");
          await closed;
          stopSimulation();
          if (!log.includes("/v4/events/"))
            throw new Error(
              "No Fingerprint event request was recorded by the simulation",
            );
          console.log(
            "Fingerprint simulation: verified Server API HTTP requests recorded.",
          );
        },
      },
    };
  } catch (e) {
    stopSimulation();
    throw e;
  }
}

import { defineConfig,loadEnv } from "vite";
import { resolve } from "node:path";
export default defineConfig(({mode})=>{
 const env={...loadEnv(mode,resolve(import.meta.dirname,".."),""),...process.env};
 const cmsHost=new URL(env.CMS_ORIGIN||env.PUBLIC_ORIGIN||"http://dashboard.localhost:5173").host;
 return {
  publicDir: "static",
  plugins: [
    {
      name: "admin-route",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if(req.headers.host===cmsHost && /^\/(?:[?].*)?$/.test(req.url||"")) req.url="/admin.html";
          req.url = req.url?.replace(/^\/admin\/?(?=\?|$)/, "/admin.html");
          next();
        });
      },
    },
  ],
  build: {
    modulePreload: false,
    // Stable filenames keep Go's templates compatible with frontend-only deployments.
    rollupOptions: {
      input: {
        invitation: resolve(import.meta.dirname, "index.html"),
        access: resolve(import.meta.dirname, "access.html"),
        admin: resolve(import.meta.dirname, "admin.html"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  server: {
    proxy: Object.fromEntries(
      [
        "^/(?:[?].*)?$",
        "/index.html",
        "/api",
        "/media",
        "/preview-image",
        "/healthz",
        "/i/",
        "/u/",
        "^/[a-f0-9-]{36}(?:[?].*)?$",
        "/preview",
      ].map((path) => [path, "http://127.0.0.1:5174"]),
    ),
  },
}});

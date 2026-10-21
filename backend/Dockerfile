FROM node:22-bookworm-slim AS templates
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.26-trixie AS build
RUN apt-get update && apt-get install -y --no-install-recommends libvips-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY backend/go.* ./
RUN go mod download
COPY backend/ ./
RUN go build -trimpath -o /invitation ./cmd/invitation

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libvips42t64 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /invitation /usr/local/bin/invitation
COPY --from=templates /frontend/dist/index.html /frontend/dist/access.html /app/templates/
ENV NODE_ENV=production LISTEN_HOST=0.0.0.0 PORT=5174 TEMPLATE_DIR=/app/templates
USER 1000:1000
EXPOSE 5174
ENTRYPOINT ["invitation"]
CMD ["serve"]

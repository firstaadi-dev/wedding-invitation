FROM node:22-alpine3.23 AS templates
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM golang:1.26-alpine3.23 AS build
RUN apk add --no-cache build-base pkgconf vips-dev
WORKDIR /build
COPY backend/go.* ./
RUN go mod download
COPY backend/ ./
RUN go build -trimpath -o /invitation ./cmd/invitation

FROM alpine:3.23
RUN apk add --no-cache ca-certificates vips ffmpeg
WORKDIR /app
COPY --from=build /invitation /usr/local/bin/invitation
COPY --from=templates /frontend/dist/index.html /frontend/dist/access.html /app/templates/
ENV NODE_ENV=production LISTEN_HOST=0.0.0.0 PORT=5174 TEMPLATE_DIR=/app/templates
USER 1000:1000
EXPOSE 5174
ENTRYPOINT ["invitation"]
CMD ["serve"]

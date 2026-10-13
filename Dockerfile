FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY neon.ts tsconfig.json ./
COPY public ./public
COPY server ./server
COPY scripts ./scripts
COPY tests ./tests
COPY db ./db
RUN npm run build && npm test && npm prune --omit=dev
ENV NODE_ENV=production
USER node
CMD ["sh", "-c", "npm run db:migrate && npm start"]

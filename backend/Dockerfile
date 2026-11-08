# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY supabase-root-ca.pem ./supabase-root-ca.pem
EXPOSE 5000
CMD ["node", "src/index.js"]

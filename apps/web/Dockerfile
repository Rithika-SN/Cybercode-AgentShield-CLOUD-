FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -w @agentshield-cloud/web

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package*.json ./

RUN npm ci --production

EXPOSE 3000

CMD ["npm", "start", "-w", "@agentshield-cloud/web"]

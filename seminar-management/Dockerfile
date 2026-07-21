# Development image — the app runs `next dev` with the source bind-mounted
# by docker-compose so code changes hot-reload. A production build would use
# a multi-stage image (deps -> build -> standalone runner); out of scope here
# and documented as a known limitation in the README.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first so they cache independently of source changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Prisma client must be generated inside the container (binary targets differ
# from the host). Runs again on start in case the schema changed via bind mount.
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm run dev"]

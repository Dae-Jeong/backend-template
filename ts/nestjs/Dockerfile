ARG NODE_VERSION
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json .node-version ./
RUN test "$(node --version)" = "v$(cat .node-version)" && npm install --prefix /opt/pnpm --no-package-lock "$(node -p 'require("./package.json").packageManager')"
ENV PATH="/opt/pnpm/node_modules/.bin:${PATH}"
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production SERVER_HOST=0.0.0.0 SERVER_PORT=3000
ENV PATH="/opt/pnpm/node_modules/.bin:${PATH}"
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid 10001 --no-create-home app && mkdir /app/data && chown 10001:10001 /app/data
COPY --from=build --chown=10001:10001 /opt/pnpm /opt/pnpm
COPY --from=build --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/dist ./dist
COPY --chown=10001:10001 package.json pnpm-lock.yaml pnpm-workspace.yaml drizzle.config.ts .node-version ./
COPY --chown=10001:10001 drizzle ./drizzle
COPY --chown=10001:10001 --chmod=755 scripts/start.sh ./scripts/start.sh
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.SERVER_PORT+'/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["./scripts/start.sh"]

# ---------- Build ----------
# Das Ergebnis ist statisches HTML/JS — gebaut wird immer auf der Host-Architektur,
# nur das nginx-Laufzeit-Image gibt es je Zielplattform.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .
RUN npm run test && npm run build

# ---------- Laufzeit ----------
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN printf '#!/bin/sh\nwget -q --spider http://127.0.0.1/ || exit 1\n' > /healthcheck.sh \
 && chmod +x /healthcheck.sh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD /healthcheck.sh

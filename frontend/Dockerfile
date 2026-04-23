# Stage 1 – Build (runs natively on the CI runner, no QEMU)
FROM --platform=$BUILDPLATFORM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_BACKEND_URL=""
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_SHOW_ENV_BANNER=""
ARG VITE_DEPLOY_BRANCH=""
ARG VITE_DEPLOY_COMMIT=""
ARG VITE_BUILD_DATE=""
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_SHOW_ENV_BANNER=$VITE_SHOW_ENV_BANNER
ENV VITE_DEPLOY_BRANCH=$VITE_DEPLOY_BRANCH
ENV VITE_DEPLOY_COMMIT=$VITE_DEPLOY_COMMIT
ENV VITE_BUILD_DATE=$VITE_BUILD_DATE

RUN npm run build

# Stage 2 – Serve (arm64 image, just static files)
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]

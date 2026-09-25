FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/backoffice/package.json ./apps/backoffice/package.json
COPY packages/renderer/package.json ./packages/renderer/package.json
RUN npm install
COPY apps ./apps
COPY packages ./packages
RUN npm run build

FROM nginx:alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/apps/web/dist /usr/share/nginx/html
COPY --from=build /build/apps/backoffice/dist /usr/share/nginx/backoffice

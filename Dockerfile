FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Lockfile is generated on the host; npm ci then skips optional native bindings
# for this platform (npm/cli#4828). Vite 8/rolldown needs the musl binary.
RUN npm ci \
 && npm install --no-save @rolldown/binding-linux-x64-musl

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

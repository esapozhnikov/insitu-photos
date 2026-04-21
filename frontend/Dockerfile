# Stage 1: Build the React app
FROM node:20-slim AS build

WORKDIR /app

ARG VITE_OTEL_EXPORTER_OTLP_ENDPOINT
ENV VITE_OTEL_EXPORTER_OTLP_ENDPOINT=$VITE_OTEL_EXPORTER_OTLP_ENDPOINT

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN chmod +x node_modules/.bin/* && npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files from stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config for proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

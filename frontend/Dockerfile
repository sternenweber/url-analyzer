# ── Stage 1: Build 
FROM node:20 AS builder
WORKDIR /app

# 1) Accept Vite envs from build args
ARG VITE_API_BASE_URL
ARG VITE_API_TOKEN
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_TOKEN=${VITE_API_TOKEN}

# 2) Better layer caching + reproducible installs
COPY package*.json ./
RUN npm ci

# 3) Build
COPY . .
RUN npm run build

# ── Stage 2: Serve (Nginx)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

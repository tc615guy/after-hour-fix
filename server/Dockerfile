# OpenAI Realtime Server - Production Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src ./src
COPY scripts ./scripts

# Copy Prisma schema from parent directory
COPY ../prisma ./prisma

# Generate Prisma client
RUN npm run postinstall

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Start server
CMD ["node", "dist/index.js"]


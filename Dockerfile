# Lightweight Dockerfile for GenAI Studio Preview
FROM node:24-slim

# Install pnpm and tsx globally
RUN npm install -g pnpm tsx

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose ports for Vite preview servers
EXPOSE 4000-4010

# Default command: launch the preview system
CMD ["pnpm", "run", "preview"]

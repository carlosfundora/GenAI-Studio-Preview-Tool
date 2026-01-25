# Lightweight Dockerfile for Exhibitron Version Preview System
FROM node:24-slim

# Install pnpm and tsx globally
RUN npm install -g pnpm tsx

# Set working directory
WORKDIR /app

# We expect the Projects directory to be mounted at /app/Projects
# The launcher will run from /app/Projects/.dev-tools/version-launcher/

# Pre-install dependencies for the launcher itself
COPY package.json .
RUN pnpm install

# Expose ports for Vite preview servers
EXPOSE 4000-4010

# Default command: launch the preview system
# We run it in non-interactive mode if --target is provided, or interactive if not.
# Users can override this in docker-compose
CMD ["pnpm", "run", "preview"]

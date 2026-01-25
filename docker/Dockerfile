# Lightweight Dockerfile for GenAI Studio Preview
FROM node:24-slim

# Install pnpm and tsx globally
RUN npm install -g pnpm tsx

# Set working directory
WORKDIR /app

# We expect the Projects directory to be mounted at /app/Projects
# Pre-install dependencies for the launcher itself
# (In a real open source repo, we might copy the whole tool but here we mount)

# Expose ports for Vite preview servers
EXPOSE 4000-4010

# Default command: launch the preview system
CMD ["pnpm", "run", "preview"]

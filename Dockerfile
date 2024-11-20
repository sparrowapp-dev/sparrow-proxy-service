# Stage 1: Build the application
FROM node:20-alpine as build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn

# Copy the rest of the application code
COPY . .

# Build the application
RUN yarn build

# Stage 2: Create a production image
FROM node:20-alpine as production

# Set the working directory
WORKDIR /app

# Copy the build output and dependencies from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main.js"]
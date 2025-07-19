# Stage 1: Build Node.js dependencies and application
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
# This step is crucial for efficient caching. If package.json doesn't change,
# npm install won't run again on subsequent builds.
COPY package*.json ./

# Install backend dependencies
RUN npm install --production

# Copy the rest of your application code
COPY . .

# Stage 2: Create a smaller production image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Expose the port your backend server listens on (e.g., 5000)
# Make sure this matches the port your Express app is configured to listen on.
EXPOSE 5000

# Command to run your backend application
# Ensure your package.json has a "start" script, e.g., "node index.js"
CMD ["npm", "run", "dev"]


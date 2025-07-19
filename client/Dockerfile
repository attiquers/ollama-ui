# Stage 1: Build the React application
FROM node:20-alpine AS build

# No longer using ARG/ENV for VITE_REACT_APP_API_URL directly here.
# Vite will read from the .env.production file copied below.
# ARG VITE_REACT_APP_API_URL # REMOVED
# ENV VITE_REACT_APP_API_URL=${VITE_REACT_APP_API_URL} # REMOVED

# Set the working directory inside this build stage container.
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker's build cache.
COPY package*.json ./

# ADDED: Copy the .env.production file into the container.
# Vite will automatically pick up VITE_ prefixed variables from this file during the build.
COPY .env.production ./.env

# Install frontend dependencies.
RUN npm install

# Copy the rest of your frontend code into the container.
COPY . .

# Build the React app for production.
# Vite will now read VITE_REACT_APP_API_URL from the copied .env file.
RUN npm run build

# Stage 2: Serve the static files with a lightweight Nginx web server.
FROM nginx:stable-alpine

# Remove Nginx's default configuration file. We'll provide our own.
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom Nginx configuration file into the Nginx container.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the 'build' stage to Nginx's public directory.
# Vite outputs to 'dist' by default.
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80.
EXPOSE 80

# Command to start Nginx in the foreground.
CMD ["nginx", "-g", "daemon off;"]
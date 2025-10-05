# Use the official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application
COPY . .

# Expose the port your app listens on (optional)
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]

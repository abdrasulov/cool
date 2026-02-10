FROM node:18-alpine

WORKDIR /app

# Install server dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Install client dependencies and build
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npx react-scripts build

# Copy server
COPY server/ ./server/

EXPOSE 3001

CMD ["node", "server/index.js"]

FROM node:22-alpine

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ARG VITE_APP_BASE_PATH=/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_BASE_PATH=${VITE_APP_BASE_PATH}

COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]

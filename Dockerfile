# Dockerfile
FROM node:16-alpine

RUN apk --no-cache add \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev

WORKDIR /
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "npm", "start" ]

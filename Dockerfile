# Dockerfile
FROM node:16-alpine

RUN apk --no-cache add \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    fontconfig-dev

WORKDIR /
COPY package*.json ./
RUN npm install
COPY . .

RUN apk add --no-cache msttcorefonts-installer fontconfig && \
    update-ms-fonts && \
    fc-cache -f

CMD [ "npm", "start" ]

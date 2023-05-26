FROM --platform=linux/amd64 node:16.20

RUN apt-get update

RUN mkdir /app
WORKDIR /app

ADD . .

RUN npm i
RUN npm run build

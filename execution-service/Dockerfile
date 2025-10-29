FROM node:22-alpine
LABEL maintainer=ywllowsensor

WORKDIR /

COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . .

EXPOSE 4000

CMD ["npm","start"]
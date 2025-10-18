FROM node:22-alpine
LABEL maintainer=ywllowsensor

WORKDIR /

COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . .

EXPOSE 3003

CMD ["npm","start"]
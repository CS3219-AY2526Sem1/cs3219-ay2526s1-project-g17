FROM node:22-alpine
LABEL maintainer=ywllowsensor

WORKDIR /

COPY package.json ./
RUN npm install
COPY . .

EXPOSE 3002

CMD ["npm","start"]
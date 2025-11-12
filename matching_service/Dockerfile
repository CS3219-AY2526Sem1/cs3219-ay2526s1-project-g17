FROM node:22-alpine
LABEL maintainer=ywllowsensor

WORKDIR /

COPY package.json ./
RUN npm install
COPY . .

EXPOSE 3001

CMD ["npm","start"]
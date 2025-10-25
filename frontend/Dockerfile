FROM node:22-alpine
LABEL maintainer=ywllowsensor

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . .

EXPOSE 5173

CMD ["npm","run","dev","--","--host"]
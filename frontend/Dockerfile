FROM node:22-alpine
LABEL maintainer=ywllowsensor

WORKDIR /app

COPY package.json ./
RUN npm install
COPY . .

RUN npm run build
RUN npm install -g serve

EXPOSE $PORT

CMD ["sh", "-c", "serve -s dist -l ${PORT:-5173}"]
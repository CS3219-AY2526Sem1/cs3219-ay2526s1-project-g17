FROM node:22-alpine
LABEL maintainer=ywllowsensor

WORKDIR /app
COPY . .
RUN npm install
EXPOSE 5001

CMD ["npm","start"]
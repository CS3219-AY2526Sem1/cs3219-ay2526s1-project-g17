FROM node:22-alpine
LABEL maintainer=rahula1008

WORKDIR /

COPY package.json ./
RUN npm install
COPY . .

EXPOSE 3004

CMD ["npm","start"]
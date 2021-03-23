FROM node:14-alpine

ENV NODE_ENV build

WORKDIR /app

COPY . /app

RUN npm install

EXPOSE 3000

CMD ["npm", "run", "start"]

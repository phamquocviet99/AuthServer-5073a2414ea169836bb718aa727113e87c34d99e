FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /index
COPY package.json /index
RUN npm install --production --silent && mv node_modules ../
COPY . /index
CMD node index.js
EXPOSE 5000
USER node


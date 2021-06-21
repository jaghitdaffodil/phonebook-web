FROM node:10

RUN npm install -g http-server

WORKDIR /angular-web

COPY package*.json /angular-web/

RUN npm install --no-audit

COPY . /angular-web/

RUN npm run build

EXPOSE 8080

CMD [ "http-server", "dist/angular-web" ]

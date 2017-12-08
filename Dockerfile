FROM node:8.8.1

RUN curl https://install.meteor.com/ | sh

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN meteor build ./dist --architecture os.linux.x86_64 --allow-superuser

# ======================================================================================================================

FROM node:8.8.1

EXPOSE 3000

ENV PORT=3000

WORKDIR /usr/src/app

COPY --from=0 /usr/src/app/dist/app.tar.gz ./

RUN tar xzf app.tar.gz --strip-components=1 && \
    cd ./programs/server && \
    npm install

CMD ["node", "main.js"]

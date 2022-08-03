FROM openjdk:18

# Create user boothby with home and shell
RUN useradd -ms /bin/sh -u 1000 boothby

# Run the following command as boothby
USER boothby

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY --chown=boothby package*.json ./

ENV NODE_VERSION 16.16.0

# Install node
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash \
  && source ~/.bashrc \
  && npm install --omit=dev

ENV NVM_DIR ~/.nvm
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH
ENV JAVA_OPTS "-Dfile.encoding=UTF-8"

# # Bundle app source
COPY --chown=boothby . .

CMD [ "node", "src/index.js" ]

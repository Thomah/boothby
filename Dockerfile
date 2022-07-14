FROM openjdk:18

# Create user boothby with home and shell
RUN useradd -ms /bin/sh boothby

# Run the following command as boothby
USER boothby

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY --chown=boothby package*.json ./

# Install node
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash - \
  && source ~/.bashrc \
  && nvm install --lts \
  && npm install --omit=dev

# Bundle app source
COPY --chown=boothby . .

EXPOSE 8080
CMD [ "node", "src/index.js" ]

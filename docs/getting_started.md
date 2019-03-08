# Prerequisites

- NodeJS 10.15+ with npm in PATH variable
- MongoDB Server 4.0
- Slack Client
- Be added to the Testing Boothby Slack workspace
- MongoDB Client (not mandatory but strongly recommanded if you're not a PGM of Mongo)

# Run the app

## On a development workstation

- Create a MongoDb database named `heroku_lqkdtf3k`. Yes the name is static, it's crap and we'll change that in the future.
- Run the following commands in a a Git Bash terminal
```bash
git clone https://github.com/valeuriad-techlab/Boothby.git
cd Boothby
npm install
cp bin/setenv.sh.template bin/setenv.sh
```
- Fill the file `bin/setenv.sh` with the following values (1) :
```bash
export SLACK_CLIENT_ID=<ask-someone-of-the-team>
export SLACK_CLIENT_SECRET=<ask-someone-of-the-team>
export ROOT_URL=http://localhost:8080
export MONGODB_URI=mongodb://localhost:27017/heroku_lqkdtf3k
```

- Run the app using `node src/index.js`

(1) On Windows, you should create each environment variables in `bin\setenv.sh` inside your environment variables. They are located here :
`System > Advanced System Parameters > Environment Variables`.

(2) On Linux, just run `source bin/setenv.sh` after setting values

## On a Ubuntu production environment

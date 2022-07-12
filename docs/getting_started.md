# Prerequisites

- NodeJS 10.15+ with npm in PATH variable
- PostgreSQL Database
- Slack Client
- Be added to the Testing Boothby Slack workspace
- PostgreSQL Client (not mandatory but strongly recommanded if you're not a PGM of `psql`)

# Run the app

## On a development workstation

Provide the following environment variables (in a `.env` file for example):

```
PORT = <Port Boothby will listen on | Default : 80>

PGHOST = <Host of the PostgreSQL DB | Default : localhost>
PGPORT = <Port of the PostgreSQL DB | Default : 5432>
PGDATABASE = <Name of the PostgreSQL DB | Default : boothby>
PGUSER = <User used to connect to the PostgreSQL DB | Default : boothby>
PGPASSWORD = <Password used to connect to the PostgreSQL DB | Default : boothby>

SLACK_CLIENT_ID=<Slack App client ID>
SLACK_CLIENT_SECRET=<Slack App client secret>
SLACK_SIGNING_SECRET=<Slack App signing secret>

APP_URL=<Exposed URL of Boothby>
```

Run the app using `npm start`

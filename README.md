# Boothby

## Prerequisites

- NodeJS 16
- Java 18 (for running liquibase)

## Configure the app

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

## Open a tunnel to test the app locally

In a dedicated terminal, launch ngrok :

```cmd
ngrok http 80
```

Take note of the ngrok URL and report the HTTPS URL in the `APP_URL` env variable :

```
APP_URL=<Exposed URL of Boothby>
```

Then, run the app in another terminal :

```cmd
npm start
```

## Configure Slack with Ngrok

In the Slack App, navigate to :
- `Interactivity & Shortcuts` : set the Request URL as `<Ngrok URL>/api/interactive`
- `OAuth & Permissions` : set the Redirect URLs as `<NGrok URL>`
- `Event Subscriptions` : set the Request URL as `<Ngrok URL>/slack/events`

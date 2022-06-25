# Boothby

## Configure the app

Configuration is brought to the app with the `dotenv` package. You need a `.env`
file with the following content :

```
MONGODB_URI=mongodb://<DB username>:<DB password>@<DB host>:<DB port>/<DB name>
SLACK_CLIENT_ID=<Slack App client ID>
SLACK_CLIENT_SECRET=<Slack App client secret>
SLACK_SIGNING_SECRET=<Slack App signing secret>
APP_URL=<URL of this App>
```

## Open a tunnel to test the app locally

In a dedicated terminal, launch ngrok :

```cmd
ngrok http 80
```

Take note of the ngrok URL and report the HTTPS URL in the `APP_URL` env variable :

```
APP_URL=<URL of this App>
```

Then, run the app in another terminal :

```cmd
npm start
```

## Subscribe to Slack events

Go to the `Event Subscriptions` page of the Slack App and define the following URL as Request URL : `<Ngrok URL>/slack/events`

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

#### Run a debug HTTPS server with certificates

Then run the following commands :

```cmd
mkcert -install
mkcert localhost
```
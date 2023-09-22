/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('slack_teams', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    app_id: {
      type: 'varchar(255)'
    },
    authed_user_id: {
      type: 'varchar(255)'
    },
    scope: {
      type: 'varchar(255)'
    },
    token_type: {
      type: 'varchar(255)'
    },
    access_token: {
      type: 'varchar(255)'
    },
    bot_user_id: {
      type: 'varchar(255)'
    },
    team_id: {
      type: 'varchar(255)'
    },
    team_name: {
      type: 'varchar(255)'
    },
    incoming_webhook_channel: {
      type: 'varchar(255)'
    },
    incoming_webhook_channel_id: {
      type: 'varchar(255)'
    },
    incoming_webhook_configuration_url: {
      type: 'varchar(255)'
    },
    incoming_webhook_url: {
      type: 'varchar(255)'
    },
    bot_id: {
      type: 'varchar(255)'
    },
    progression: {
      type: 'bigint'
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('slack_teams');
};

/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('messages', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    type_slack: {
      type: 'varchar(255)'
    },
    client_msg_id: {
      type: 'varchar(255)'
    },
    text_slack: {
      type: 'varchar(255)'
    },
    user_slack: {
      type: 'varchar(255)'
    },
    ts: {
      type: 'varchar(255)'
    },
    team_slack: {
      type: 'varchar(255)'
    },
    blocks: {
      type: 'text'
    },
    channel: {
      type: 'varchar(255)'
    },
    event_ts: {
      type: 'varchar(255)'
    },
    channel_type: {
      type: 'varchar(255)'
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('messages');
};

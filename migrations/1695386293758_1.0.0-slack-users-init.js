/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('slack_users', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    im_id: {
      type: 'varchar(255)'
    },
    slack_id: {
      type: 'varchar(255)'
    },
    slack_team_id: {
      type: 'bigint'
    },
    user_id: {
      type: 'bigint'
    },
    consent: {
      type: 'boolean'
    }
  });

  pgm.addConstraint(
    'slack_users',
    'fk_user', {
    foreignKeys: {
      columns: ['user_id'],
      references: 'users(id)'
    }
  });

  pgm.addConstraint(
    'slack_users',
    'fk_slack_team', {
    foreignKeys: {
      columns: ['slack_team_id'],
      references: 'slack_teams(id)'
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('slack_users');
};

/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('experiences', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    obtained_at: {
      type: 'timestamp',
      default: 'now()'
    },
    slack_id: {
      type: 'varchar(255)'
    },
    slack_team_id: {
      type: 'bigint'
    },
    reason: {
      type: 'varchar(255)'
    },
    experience: {
      type: 'bigint',
      notNull: true
    }
  });
  pgm.addConstraint(
    'experiences',
    'fk_slack_team', {
    foreignKeys: {
      columns: ['slack_team_id'],
      references: 'slack_teams(id)',
      onDelete: 'cascade'
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('experiences');
};

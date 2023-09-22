/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('levels', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    slack_team_id: {
      type: 'bigint'
    },
    level: {
      type: 'bigint',
      default: 1
    },
    experience: {
      type: 'bigint',
      default: 0
    },
    max_experience: {
      type: 'bigint',
      default: 800
    }
  });
  pgm.addConstraint(
    'levels',
    'fk_slack_team', {
    foreignKeys: {
      columns: ['slack_team_id'],
      references: 'slack_teams(id)',
      onDelete: 'cascade'
    }
  });
  pgm.sql("INSERT INTO levels(slack_team_id) SELECT id FROM slack_teams");
};

exports.down = pgm => {
  pgm.dropTable('levels');
};

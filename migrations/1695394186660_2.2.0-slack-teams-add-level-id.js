/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'slack_teams', {
    level_id: {
      type: 'bigint'
    }
  });
  pgm.addConstraint(
    'slack_teams',
    'fk_level', {
    foreignKeys: {
      columns: ['level_id'],
      references: 'levels(id)'
    }
  });
  pgm.sql("UPDATE slack_teams s SET level_id = (SELECT l.id FROM levels l WHERE l.slack_team_id = s.id)");
};

exports.down = pgm => {
  pgm.dropColumns(
    'slack_teams', {
    level_id: {
      type: 'bigint'
    }
  });
};

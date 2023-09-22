/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('surveys_answers_slack_users', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    slack_id: {
      type: 'varchar(255)'
    },
    slack_team_id: {
      type: 'varchar(255)'
    },
    surveys_answer_id: {
      type: 'bigint'
    }
  });
  pgm.addConstraint(
    'surveys_answers_slack_users',
    'fk_surveys_answer', {
    foreignKeys: {
      columns: ['surveys_answer_id'],
      references: 'surveys_answers(id)',
      onDelete: 'cascade'
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('surveys_answers_slack_users');
};

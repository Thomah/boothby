/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('surveys_answers', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    nb_votes: {
      type: 'bigint'
    },
    survey_id: {
      type: 'bigint'
    }
  });
  pgm.addConstraint(
    'surveys_answers',
    'fk_survey', {
    foreignKeys: {
      columns: ['survey_id'],
      references: 'surveys(id)',
      onDelete: 'cascade'
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('surveys_answers');
};

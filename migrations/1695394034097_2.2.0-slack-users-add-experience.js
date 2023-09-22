/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'slack_users', {
    experience: {
      type: 'bigint',
      default: 0
    }
  });
};

exports.down = pgm => {
  pgm.dropColumns(
    'slack_users', {
    experience: {
      type: 'bigint'
    }
  });
};

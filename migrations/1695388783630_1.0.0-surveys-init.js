/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('surveys', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    type: {
      type: 'varchar(255)'
    },
    text: {
      type: 'varchar(255)'
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('surveys');
};

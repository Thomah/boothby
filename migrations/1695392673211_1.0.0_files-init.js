/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('files', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    name: {
      type: 'varchar(255)'
    },
    type: {
      type: 'varchar(255)'
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('files');
};

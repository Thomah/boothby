/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('users', {
    id: {
      type: 'bigint',
      primaryKey: true,
      sequenceGenerated: {
        precedence: "BY DEFAULT"
      }
    },
    username: {
      type: 'varchar(255)',
      notNull: true
    },
    password: {
      type: 'varchar(255)',
      notNull: true
    }
  });
};

exports.down = pgm => {
  pgm.dropTable('users');
};

/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('configs', {
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
    cron: {
      type: 'varchar(255)'
    },
    active: {
      type: 'boolean'
    }
  });
  pgm.sql("INSERT INTO configs(\"name\", cron, active) VALUES('dialog-publish', '42 9 * * 3', true);");
};

exports.down = pgm => {
  pgm.dropTable('configs');
};

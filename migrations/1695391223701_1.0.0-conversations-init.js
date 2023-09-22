/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('conversations', {
      id: {
        type: 'bigint',
        primaryKey: true,
        sequenceGenerated: {
          precedence: "BY DEFAULT"
        }
      },
      channel: {
        type: 'varchar(255)'
      },
      slack_team_id: {
        type: 'bigint'
      },
      dialog_id: {
        type: 'bigint'
      },
      last_message_id: {
        type: 'bigint'
      },
      outputs: {
        type: 'text'
      },
      status: {
        type: 'varchar(255)'
      }
    });
    pgm.addConstraint(
      'conversations',
      'fk_slack_team', {
      foreignKeys: {
        columns: ['slack_team_id'],
        references: 'slack_teams(id)',
        onDelete: 'cascade'
      }
    });
    pgm.addConstraint(
      'conversations',
      'fk_dialog', {
      foreignKeys: {
        columns: ['dialog_id'],
        references: 'dialogs(id)',
        onDelete: 'cascade'
      }
    });
};

exports.down = pgm => {
  pgm.dropTable('conversations');
};

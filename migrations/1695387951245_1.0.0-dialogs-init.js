/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createTable('dialogs', {
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
    category: {
      type: 'varchar(255)'
    },
    channel: {
      type: 'varchar(255)'
    },
    scheduling: {
      type: 'bigint'
    },
    messages: {
      type: 'text'
    }
  });
  pgm.sql("INSERT INTO dialogs(\"name\", category, channel, scheduling, messages) VALUES('Consent PM', 'intro', 'pm_everybody', 0, '{\"0\":{\"channel\":\"pm_everybody\",\"wait\":0,\"text\":\"Salut !\",\"blocks\":[],\"attachments\":[],\"outputs\":[{\"id\":\"1\",\"text\":\"Default\"}],\"next\":\"1\"},\"1\":{\"channel\":\"pm_everybody\",\"wait\":800,\"text\":\"Tu ne me connais peut-être pas, je suis Boothby, le bot du Green IT. Je publie régulièrement des infos dans #greenit mais parfois, je m''adresse directement à vous en message privé.\",\"blocks\":[],\"attachments\":[],\"outputs\":[{\"id\":\"2\",\"text\":\"Default\"}],\"next\":\"2\"},\"2\":{\"channel\":\"pm_everybody\",\"wait\":800,\"text\":\"Acceptes-tu de recevoir sur ce canal des astuces, quizz ou infos pour t''aider à améliorer ton impact écologique au sein de ton entreprise ? Rassure-toi, je ne suis pas aussi bavard que j''en ai l''air :wink:\",\"blocks\":[],\"attachments\":[],\"outputs\":[{\"id\":\"4\",\"text\":\":-1: Non, merci.\"},{\"id\":\"3\",\"text\":\":+1: Avec plaisir !\"}],\"next\":\"3\"},\"3\":{\"channel\":\"pm_everybody\",\"wait\":800,\"text\":\"Super ! Content de pouvoir échanger avec toi. A très vite !\",\"blocks\":[],\"attachments\":[],\"outputs\":[],\"next\":\"4\"},\"4\":{\"channel\":\"pm_everybody\",\"wait\":800,\"text\":\"Dommage... Mais je respecte ton choix ! Tu ne recevras plus de message de ma part.\",\"blocks\":[],\"attachments\":[],\"outputs\":[]}}');");
  pgm.sql("INSERT INTO dialogs(\"name\", category, channel, scheduling, messages) VALUES('Welcome Message', 'intro', 'nowhere', 0, '{\"0\":{\"channel\":\"nowhere\",\"wait\":0,\"text\":\"Bonjour tout le monde !\",\"blocks\":[],\"attachments\":[],\"outputs\":[{\"id\":\"1\",\"text\":\"Default\"}],\"next\":\"1\"},\"1\":{\"channel\":\"nowhere\",\"wait\":3000,\"text\":\"Vous connaissez le Green IT ?\",\"blocks\":[],\"attachments\":[],\"outputs\":[{\"id\":\"2\",\"text\":\"Default\"}],\"next\":\"2\"},\"2\":{\"channel\":\"nowhere\",\"wait\":3000,\"text\":\"Que vous soyez expert ou débutant, on essaye d''y voir plus clair en débattant des solutions possibles pour rendre l''IT un peu meilleur.\",\"blocks\":[],\"attachments\":[],\"outputs\":[{\"id\":\"3\",\"text\":\"Default\"}],\"next\":\"3\"},\"3\":{\"channel\":\"nowhere\",\"wait\":9200,\"text\":\"Rendez-vous chaque semaine dans ce canal pour participer à cette aventure ! :rocket:\",\"blocks\":[],\"attachments\":[],\"outputs\":[]}}');");
};

exports.down = pgm => {
  pgm.dropTable('dialogs');
};

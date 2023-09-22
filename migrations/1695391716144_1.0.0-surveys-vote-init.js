/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.createFunction(
    'surveys_vote',
    [
      {
        mode: 'in',
        name: '_survey_id',
        type: 'bigint'
      },
      {
        mode: 'in',
        name: '_surveys_answer_id',
        type: 'bigint'
      },
      {
        mode: 'in',
        name: '_slack_id',
        type: 'varchar(255)'
      },
      {
        mode: 'out',
        name: 'answer_id',
        type: 'bigint'
      },
      {
        mode: 'out',
        name: 'votes',
        type: 'bigint'
      },
      {
        mode: 'out',
        name: 'votes_team',
        type: 'bigint'
      }
    ], {
    returns: 'setof record',
    language: 'plpgsql'
  }, `
DECLARE
  _survey_type VARCHAR;
  _answer record;
  _nb_user_votes BIGINT;
  _has_voted BIGINT;
  _slack_team_id VARCHAR;
BEGIN
  --Get survey type
  select s.type into _survey_type from surveys s where s.id = _survey_id;

  --Verify if user has already voted this answer
  select count(*) into _has_voted from surveys_answers_slack_users where slack_id = _slack_id and surveys_answer_id = _surveys_answer_id;

  --If the type is "single_answer", we remove all previous answers of the user
  if _survey_type = 'single_answer' then
    for _answer in select id from surveys_answers
    loop 
      select count(*) into _nb_user_votes from surveys_answers_slack_users sasu inner join surveys_answers sa on sasu.surveys_answer_id = sa.id inner join surveys s on s.id = sa.survey_id where sa.id = _answer.id and sasu.slack_id = _slack_id;
      update surveys_answers sa set nb_votes = sa.nb_votes - _nb_user_votes where sa.id = _answer.id;
      delete from surveys_answers_slack_users sasu where sasu.slack_id = _slack_id and sasu.surveys_answer_id = _answer.id;
    end loop;
  end if;

  --Get the corresponding Slack team
  select st.team_id into _slack_team_id from slack_users su inner join slack_teams st on st.id = su.slack_team_id where su.slack_id = _slack_id group by st.team_id;

  --If has not previously voted the answer, submit the answer
  if _has_voted = 0 then
    insert into surveys_answers_slack_users(slack_id, slack_team_id, surveys_answer_id) values(_slack_id, _slack_team_id, _surveys_answer_id);
    update surveys_answers set nb_votes = nb_votes + 1 where survey_id = _survey_id and id = _surveys_answer_id;
  end if;

  --Return a table of current votes
  return query
    select
      sa.id as answer_id,
      sa.nb_votes as votes,
      count(sasu.id) as votes_team 
    from surveys_answers sa 
      left outer join surveys_answers_slack_users sasu on sasu.surveys_answer_id = sa.id 
    where sa.survey_id = _survey_id
      and(sasu.slack_team_id = _slack_team_id or sasu.id is null)
    group by sa.id, sasu.surveys_answer_id;
  END;
  `);

};

exports.down = pgm => {
  pgm.dropFunction(
    'surveys_vote',
    [
      {
        mode: 'in',
        name: '_survey_id',
        type: 'bigint'
      },
      {
        mode: 'in',
        name: '_surveys_answer_id',
        type: 'bigint'
      },
      {
        mode: 'in',
        name: '_slack_id',
        type: 'varchar(255)'
      },
      {
        mode: 'out',
        name: 'answer_id',
        type: 'bigint'
      },
      {
        mode: 'out',
        name: 'votes',
        type: 'bigint'
      },
      {
        mode: 'out',
        name: 'votes_team',
        type: 'bigint'
      }
    ]);
};
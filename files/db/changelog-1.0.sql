--liquibase formatted sql

--changeset boothby:create-sequence-id_number
CREATE SEQUENCE IF NOT EXISTS id_number
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--rollback drop sequence id_number;

--changeset boothby:create-table-users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    password CHARACTER VARYING(255) NOT NULL,
    username CHARACTER VARYING(255)
);
--rollback drop table users;

--changeset boothby:create-table-slack_teams
CREATE TABLE IF NOT EXISTS slack_teams (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    app_id CHARACTER VARYING(255),
    authed_user_id CHARACTER VARYING(255),
    scope CHARACTER VARYING(255),
    token_type CHARACTER VARYING(255),
    access_token CHARACTER VARYING(255),
    bot_user_id CHARACTER VARYING(255),
    team_id CHARACTER VARYING(255),
    team_name CHARACTER VARYING(255),
    incoming_webhook_channel CHARACTER VARYING(255),
    incoming_webhook_channel_id CHARACTER VARYING(255),
    incoming_webhook_configuration_url CHARACTER VARYING(255),
    incoming_webhook_url CHARACTER VARYING(255),
    bot_id CHARACTER VARYING(255),
    progression BIGINT
);
--rollback drop table slack_teams;

--changeset boothby:create-table-slack_users
CREATE TABLE IF NOT EXISTS slack_users (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    im_id CHARACTER VARYING(255),
    slack_id CHARACTER VARYING(255),
    slack_team_id BIGINT,
    user_id BIGINT,
    consent BOOLEAN
);
--rollback drop table slack_users;

--changeset boothby:add-fk-slack_users
ALTER TABLE ONLY slack_users
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    ADD CONSTRAINT fk_slack_team FOREIGN KEY (slack_team_id) REFERENCES slack_teams(id) ON DELETE CASCADE;
--rollback alter table slack_users drop constraint fk_slack_team;
--rollback alter table slack_users drop constraint fk_user;

--changeset boothby:create-table-messages
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    type_slack CHARACTER VARYING(255),
    client_msg_id CHARACTER VARYING(255),
    text_slack CHARACTER VARYING(255),
    user_slack CHARACTER VARYING(255),
    ts CHARACTER VARYING(255),
    team_slack CHARACTER VARYING(255),
    blocks TEXT,
    channel CHARACTER VARYING(255),
    event_ts CHARACTER VARYING(255),
    channel_type CHARACTER VARYING(255)
);
--rollback drop table messages;

--changeset boothby:create-table-configs
CREATE TABLE IF NOT EXISTS configs (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    name CHARACTER VARYING(255),
    cron CHARACTER VARYING(255),
    active BOOLEAN
);
--rollback drop table configs;

--changeset boothby:create-data-configs
INSERT INTO configs("name", cron, active) VALUES('dialog-publish', '42 9 * * 3', true);
--rollback delete from configs where name = 'dialog-publish';

--changeset boothby:create-table-dialogs
CREATE TABLE IF NOT EXISTS dialogs (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    name CHARACTER VARYING(255),
    category CHARACTER VARYING(255),
    channel CHARACTER VARYING(255),
    scheduling BIGINT,
    messages TEXT
);
--rollback drop table dialogs;

--changeset boothby:create-data-dialogs
INSERT INTO dialogs("name", category, channel, scheduling, messages) VALUES('Consent PM', 'intro', 'pm_everybody', 0, '{"0":{"channel":"pm_everybody","wait":0,"text":"Salut !","blocks":[],"attachments":[],"outputs":[{"id":"1","text":"Default"}],"next":"1"},"1":{"channel":"pm_everybody","wait":800,"text":"Tu ne me connais peut-être pas, je suis Boothby, le bot du Green IT. Je publie régulièrement des infos dans #greenit mais parfois, je m''adresse directement à vous en message privé.","blocks":[],"attachments":[],"outputs":[{"id":"2","text":"Default"}],"next":"2"},"2":{"channel":"pm_everybody","wait":800,"text":"Acceptes-tu de recevoir sur ce canal des astuces, quizz ou infos pour t''aider à améliorer ton impact écologique au sein de ton entreprise ? Rassure-toi, je ne suis pas aussi bavard que j''en ai l''air :wink:","blocks":[],"attachments":[],"outputs":[{"id":"4","text":":-1: Non, merci."},{"id":"3","text":":+1: Avec plaisir !"}],"next":"3"},"3":{"channel":"pm_everybody","wait":800,"text":"Super ! Content de pouvoir échanger avec toi. A très vite !","blocks":[],"attachments":[],"outputs":[],"next":"4"},"4":{"channel":"pm_everybody","wait":800,"text":"Dommage... Mais je respecte ton choix ! Tu ne recevras plus de message de ma part.","blocks":[],"attachments":[],"outputs":[]}}');
INSERT INTO dialogs("name", category, channel, scheduling, messages) VALUES('Welcome Message', 'intro', 'nowhere', 0, '{"0":{"channel":"nowhere","wait":0,"text":"Bonjour tout le monde !","blocks":[],"attachments":[],"outputs":[{"id":"1","text":"Default"}],"next":"1"},"1":{"channel":"nowhere","wait":3000,"text":"Vous connaissez le Green IT ?","blocks":[],"attachments":[],"outputs":[{"id":"2","text":"Default"}],"next":"2"},"2":{"channel":"nowhere","wait":3000,"text":"Que vous soyez expert ou débutant, on essaye d''y voir plus clair en débattant des solutions possibles pour rendre l''IT un peu meilleur.","blocks":[],"attachments":[],"outputs":[{"id":"3","text":"Default"}],"next":"3"},"3":{"channel":"nowhere","wait":9200,"text":"Rendez-vous chaque semaine dans ce canal pour participer à cette aventure ! :rocket:","blocks":[],"attachments":[],"outputs":[]}}');
--rollback delete from dialogs where name = 'Welcome Message';
--rollback delete from dialogs where name = 'Consent PM';

--changeset boothby:create-table-surveys
CREATE TABLE IF NOT EXISTS surveys (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    type CHARACTER VARYING(255),
    text CHARACTER VARYING(255)
);
--rollback drop table surveys;

--changeset boothby:create-table-surveys_answers
CREATE TABLE IF NOT EXISTS surveys_answers (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    text CHARACTER VARYING(255),
    nb_votes BIGINT,
    survey_id BIGINT
);
--rollback drop table surveys_answers;

--changeset boothby:add-fk-surveys_answers
ALTER TABLE ONLY surveys_answers
    ADD CONSTRAINT fk_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE;
--rollback alter table surveys_answers drop constraint fk_survey;

--changeset boothby:create-table-surveys_answers_slack_users
CREATE TABLE IF NOT EXISTS surveys_answers_slack_users (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    slack_id CHARACTER VARYING(255),
    slack_team_id CHARACTER VARYING(255),
    surveys_answer_id BIGINT
);
--rollback drop table surveys_answers_slack_users;

--changeset boothby:add-fk-surveys_answers_slack_users
ALTER TABLE ONLY surveys_answers_slack_users
    ADD CONSTRAINT fk_surveys_answer FOREIGN KEY (surveys_answer_id) REFERENCES surveys_answers(id) ON DELETE CASCADE;
--rollback alter table surveys_answers_slack_users drop constraint fk_surveys_answer;

--changeset boothby:create-table-conversations
CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT PRIMARY KEY DEFAULT NEXTVAL('id_number'),
    channel CHARACTER VARYING(255), 
    slack_team_id BIGINT,
    dialog_id BIGINT,
    last_message_id BIGINT,
    outputs TEXT,
    status CHARACTER VARYING(255)
);
--rollback drop table conversations;

--changeset boothby:add-fk-conversations
ALTER TABLE ONLY conversations
    ADD CONSTRAINT fk_slack_team FOREIGN KEY (slack_team_id) REFERENCES slack_teams(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_dialog FOREIGN KEY (dialog_id) REFERENCES dialogs(id) ON DELETE CASCADE;
--rollback alter table conversations drop constraint fk_dialog;
--rollback alter table conversations drop constraint fk_slack_team;

--changeset boothby:add-function-surveys_vote
CREATE OR REPLACE FUNCTION surveys_vote(
        IN _survey_id BIGINT, 
        IN _surveys_answer_id BIGINT,
        IN _slack_id VARCHAR, 
        OUT answer_id BIGINT, 
        OUT votes BIGINT, 
        OUT votes_team BIGINT)
    RETURNS SETOF RECORD
	LANGUAGE plpgsql
    AS '
        DECLARE
            _survey_type VARCHAR;
			_answer record;
            _nb_user_votes BIGINT;
            _has_voted BIGINT;
            _slack_team_id VARCHAR;
        BEGIN

            -- Get survey type
            select s.type into _survey_type from surveys s where s.id = _survey_id;

            -- Verify if user has already voted this answer
            select count(*) into _has_voted from surveys_answers_slack_users where slack_id = _slack_id and surveys_answer_id = _surveys_answer_id;

            -- If the type is "single_answer", we remove all previous answers of the user
            if _survey_type = ''single_answer'' then
                for _answer in select id from surveys_answers
                loop 
                    select count(*) into _nb_user_votes from surveys_answers_slack_users sasu inner join surveys_answers sa on sasu.surveys_answer_id = sa.id inner join surveys s on s.id = sa.survey_id where sa.id = _answer.id and sasu.slack_id = _slack_id;
                    update surveys_answers sa set nb_votes = sa.nb_votes - _nb_user_votes where sa.id = _answer.id;
                    delete from surveys_answers_slack_users sasu where sasu.slack_id = _slack_id and sasu.surveys_answer_id = _answer.id;
                end loop;
            end if;

            -- Get the corresponding Slack team
            select st.team_id into _slack_team_id from slack_users su inner join slack_teams st on st.id = su.slack_team_id where su.slack_id = _slack_id group by st.team_id;

            -- If has not previously voted the answer, submit the answer
            if _has_voted = 0 then
                insert into surveys_answers_slack_users(slack_id, slack_team_id, surveys_answer_id) values (_slack_id, _slack_team_id, _surveys_answer_id);
                update surveys_answers set nb_votes = nb_votes + 1 where survey_id = _survey_id and id = _surveys_answer_id;
            end if;

            -- Return a table of current votes
			return query
				select 
                    sa.id as answer_id, 
                    sa.nb_votes as votes, 
                    count(sasu.id) as votes_team 
                from surveys_answers sa 
                    left outer join surveys_answers_slack_users sasu on sasu.surveys_answer_id = sa.id 
                where sa.survey_id = _survey_id 
                    and (sasu.slack_team_id = _slack_team_id or sasu.id is null)
                group by sa.id, sasu.surveys_answer_id;
        END;
';
--rollback drop function if exists surveys_vote;

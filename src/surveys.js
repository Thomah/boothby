const db = require('./db/index.js');
const logger = require('./logger.js');

exports.get = function (id, callback_success, callback_error) {
    db.querySync("SELECT s.id as survey_id, s.type as survey_type, " +
        "sa.id as answer_id, sa.text as answer_text, sa.nb_votes as answer_nb_votes, sa.survey_id, " +
        "sasu.id, sasu.slack_id as slack_user_id, sasu.surveys_answer_id FROM surveys s inner join surveys_answers sa on sa.survey_id = s.id left outer join surveys_answers_slack_users sasu on sa.id = sasu.surveys_answer_id WHERE s.id = $1", [id], (err, data) => {
            if (err) {
                logger.error('Cannot get survey ' + id + ' : \n -> ' + err);
                if (callback_error) {
                    callback_error();
                }
            } else if (data.rowCount < 1) {
                logger.error('Cannot get survey ' + id + ' : not found');
                if (callback_error) {
                    callback_error();
                }
            } else {
                var survey = {
                    id: data.rows[0]['survey_id'],
                    type: data.rows[0]['survey_type'],
                    answers: []
                };
                var answers = [];
                data.rows.forEach(row => {
                    var answerIndex = answers.findIndex(answer => answer.id === row['sa.id']);
                    var answer = answers[answerIndex];
                    if (answer === undefined) {
                        answer = {
                            id: row['answer_id'],
                            text: row['answer_text'],
                            nb_votes: row['answer_nb_votes'],
                            slack_user_id: []
                        };
                        answerIndex = answers.length;
                        answers.push(answer);
                    }
                    if (row['slack_user_id']) {
                        answer.slack_user_id.push(row['slack_user_id']);
                    }
                    answers[answerIndex] = answer;
                });
                survey.answers = answers;
                callback_success(survey);
            }
        });
};

exports.create = function (callback_success, callback_error) {
    db.querySync("INSERT INTO surveys(type) VALUES('single_answer') RETURNING id", [], (err, data) => {
        if (err) {
            logger.error(err);
            if (callback_error) {
                callback_error();
            }
        } else {
            var survey = data.rows[0];
            db.querySync("INSERT INTO surveys_answers(text, nb_votes, survey_id) values('', 0, $1) RETURNING id, text, nb_votes", [survey.id], (err, data) => {
                if (err) {
                    logger.error(err);
                    if (callback_error) {
                        callback_error();
                    }
                } else {
                    survey.answers = [data.rows[0]];
                    callback_success(survey);
                }
            });
        }
    });
};

exports.update = function (survey, callback_success, callback_error) {
    db.querySync("UPDATE surveys SET type = $2, text = $3 WHERE id = $1", [survey.id, survey.type, survey.text], (err) => {
        if (err) {
            logger.error(err);
            if (callback_error) {
                callback_error();
            }
        } else {
            exports.updateAnswers(survey.answers, 0, callback_success, callback_error);
        }
    });
};

exports.createAnswer = function (id, callback_success, callback_error) {
    db.querySync("INSERT INTO surveys_answers(text, nb_votes, survey_id) values('', 0, $1) RETURNING id, text, nb_votes, survey_id", [id], (err, data) => {
        if (err) {
            logger.error(err);
            if (callback_error) {
                callback_error();
            }
        } else {
            callback_success(data.rows[0]);
        }
    });
};

exports.updateAnswers = function (answers, currentAnswerIndex, callback_success, callback_error) {
    if (answers[currentAnswerIndex] === undefined) {
        callback_success();
    } else {
        logger.debug(JSON.stringify(answers[currentAnswerIndex]));
        db.querySync("UPDATE surveys_answers SET text = $2 WHERE id = $1", [answers[currentAnswerIndex].id, answers[currentAnswerIndex].text], (err) => {
            if (err) {
                logger.error(err);
                if (callback_error) {
                    callback_error();
                }
            } else {
                exports.updateAnswers(answers, currentAnswerIndex + 1, callback_success, callback_error);
            }
        });
    }
};

exports.vote = function (surveyId, answerId, slackId, callback_success, callback_error) {
    db.querySync("SELECT * FROM surveys_vote($1, $2, $3)", [surveyId, answerId, slackId], (err, data) => {
        if (err) {
            logger.error(err);
            if (callback_error) {
                callback_error();
            }
        } else {
            callback_success(data.rows);
        }
    });
};

exports.router = {};

exports.router.create = function (req, res) {
    exports.create(data => {
        res.send(JSON.stringify(data));
    }, () => {
        res.status(500).end();
    });
};

exports.router.createAnswer = function (req, res) {
    exports.createAnswer(req.params.id, data => {
        res.send(JSON.stringify(data));
    }, () => {
        res.status(500).end();
    });
};

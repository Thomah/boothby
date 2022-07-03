const db = require('./db/index.js');
const logger = require('./logger.js');

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

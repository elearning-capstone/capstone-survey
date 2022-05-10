const express = require("express");
const { Op } = require("sequelize");
const router = express.Router();
const axios = require("axios");
const { survey_group, survey_question, survey_choice, survey_result, sequelize } = require("../models");

const live_ip = "http://ip-172-31-38-32.ap-southeast-1.compute.internal:3000";
const survey_ip = "http://ip-172-31-37-162.ap-southeast-1.compute.internal:3000";

router.post("/create", async (req, res) => {
    try {
        //verify request
        const { group, description, question } = req.body;

        let is_valid = true;

        if (!group) {
            return res.status(400).json({ message: "invalid body" });
        }

        if (Array.isArray(question)) {
            question.forEach(element => {
                if (!element.question) {
                    is_valid = false;
                }

                if (Array.isArray(element.choice)) {
                    element.choice.forEach(element2 => {
                        if (!element2.choice || !element2.type) {
                            is_valid = false;
                        }

                        if(element2.type != "checkbox" && element2.type != "select" && element2.type != "input") {
                            is_valid = false;
                        }
                    });
                } else if (element.choice) {
                    is_valid = false;
                }
            });
            if (!is_valid) return res.status(400).json({ message: "invalid body" });
        } else if (question) {
            return res.status(400).json({ message: "invalid body" });
        }

        //send database query
        let result = await survey_group.create({
            name: group,
            description: description || null,
            survey_questions: question.map(element => {
                return {
                    question: element.question,
                    description: element.description || null,
                    survey_choices: (element.choice || []).map(element2 => {
                        return {
                            choice: element2.choice,
                            type: element2.type,
                            description: element2.description || null,
                        };
                    }),
                };
            }),
        }, {
            include: {
                model: survey_question,
                include: survey_choice,
            },
        });

        return res.json({
            //reformat response
            survey: {
                group_id: result.id,
                name: result.name,
                description: result.description,
                question: result.survey_questions.map(element => {
                    return {
                        question_id: element.id,
                        question: element.question,
                        description: element.description,
                        choice: element.survey_choices.map(element2 => {
                            return {
                                choice_id: element2.id,
                                choice: element2.choice,
                                type: element2.type,
                                description: element2.description,
                            };
                        }),
                    };
                }),
            },
        });
    } catch(err) {
        return res.status(404).json({ message: "not found" });
    }
});

router.get("/", async (req, res) => {
    try {
        //verify request
        const { survey_id } = req.query;

        let count = await survey_group.count({
            where: {
                id: survey_id,
                is_delete: false,
            },
        });

        if (count == 0) {
            return res.status(404).json({ message: "survey not found" });
        }

        //send database query
        let result = await survey_group.findOne({
            attributes: [ "name", "description" ],
            where: {
                id: survey_id,
                is_delete: false,
            },
            include: {
                model: survey_question,
                attributes: [ "id", "question", "description" ],
                required: false,
                where: {
                    is_delete: false,
                },
                include: {
                    model: survey_choice,
                    attributes: [ "id", "choice", "type", "description" ],
                    required: false,
                    where: {
                        is_delete: false,
                    },
                }
            },
        });

        return res.json({
            //reformat response
            survey: {
                name: result.dataValues.name,
                description: result.dataValues.description,
                question: result.dataValues.survey_questions.map(element => {
                    return {
                        question_id: element.dataValues.id,
                        question: element.dataValues.question,
                        description: element.dataValues.description,
                        choice: element.dataValues.survey_choices.map(element2 => {
                            return {
                                choice_id: element2.dataValues.id,
                                choice: element2.dataValues.choice,
                                type: element2.dataValues.type,
                                description: element2.dataValues.description,
                            };
                        }),
                    };
                }),
            },
        });
    } catch(err) {
        return res.status(404).json({ message: "not found" });
    }
});

router.post("/", async (req, res) => {
    try {
        //check group
        const { survey_id, user_id } = req.query;
        const { result } = req.body;

        let group = await survey_group.findOne({
            attributes: [ "id" ],
            where: {
                id: survey_id,
                is_delete: false,
            },
            include: {
                model: survey_question,
                attributes: [ "id" ],
                required: false,
                where: {
                    is_delete: false,
                },
                include: {
                    model: survey_choice,
                    attributes: [ "id", "type" ],
                    required: false,
                    where: {
                        is_delete: false,
                    },
                }
            },
        });

        if (!group) {
            return res.status(404).json({ message: "survey not found" });
        }
        //check user
        let answer = await survey_result.findOne({
            where: {
                user_id,
                survey_group_id: survey_id,
            },
        });

        if (answer) {
            return res.status(403).json({ message: "user already done this survey" });
        }
        //reformat body
        let choices = {};
        let n = 0;
        let is_valid = true;

        if (Array.isArray(result.question)) {
            result.question.forEach(element => {
                if (!element.question_id) {
                    is_valid = false;
                }

                let question_id = element.question_id;
                let select = 0;

                if (Array.isArray(element.choice)) {
                    element.choice.forEach(element2 => {
                        if (typeof element2.choice_id != "number" || typeof element2.type != "string") {
                            is_valid = false;
                        }

                        if (element2.type != "checkbox" && element2.type != "select" && element2.type != "input") {
                            is_valid = false;
                        }

                        if (element2.type == "select") {
                            select += 1;
                            if (select > 1) {
                                is_valid = false;
                            }
                        }

                        if (element2.type == "input") {
                            if (typeof element2.result != "string") {
                                is_valid = false;
                            }
                        }

                        n += 1;

                        choices[element2.choice_id] = {
                            question_id,
                            type: element2.type,
                            result: element2.result || null,
                        };
                    });
                } else if (element.choice) {
                    is_valid = false;
                }
            });

            if (!is_valid) return res.status(400).json({ message: "invalid body" });
        } else if (result.question) {
            return res.status(400).json({ message: "invalid body" });
        }
        //verify result
        is_valid = true;
        if (group.dataValues.survey_questions) {
            group.dataValues.survey_questions.forEach(element => {
                let question_id = element.id;

                if (element.dataValues.survey_choices) {
                    element.dataValues.survey_choices.forEach(element2 => {
                        if (choices[element2.dataValues.id]) {
                            let c = choices[element2.dataValues.id];

                            n -= 1;

                            if (c.question_id != question_id || c.type != element2.dataValues.type) {
                                is_valid = false;
                            }
                        } else if (element2.dataValues.type == "input") {
                            is_valid = false;
                        }
                    });    
                }
            });
        }
        if (n != 0 || !is_valid) {
            return res.status(400).json({ message: "invalid body" });
        }
        //send database query
        let promise = [];
        
        for (let choice_id in choices) {
            let choice = choices[choice_id];

            promise.push(survey_result.create({
                survey_group_id: survey_id,
                survey_question_id: choice.question_id,
                survey_choice_id: choice_id,
                user_id,
                result: choice.result,
            }));
        }

        await Promise.all(promise);
        //success
        return res.json({ message: "success" });
    } catch(err) {
        return res.status(404).json({ message: "not found" });
    }
});

router.get("/result", async (req, res) => {
    try {
        //verify request
        const { survey_id } = req.query;

        let count = await survey_group.count({
            where: {
                id: survey_id,
                is_delete: false,
            },
        });

        if (count == 0) {
            return res.status(404).json({ message: "survey not found" });
        }

        //send database query
        let result = await survey_group.findOne({
            attributes: [ "id", "name", "description" ],
            where: {
                id: survey_id,
                is_delete: false,
            },
            include: {
                model: survey_question,
                attributes: [ "id", "question", "description" ],
                required: false,
                where: {
                    is_delete: false,
                },
                include: {
                    model: survey_choice,
                    attributes: [ "id", "choice", "type", "description", [sequelize.fn("count", sequelize.col("survey_questions->survey_choices->survey_results.id")), "count"] ],
                    required: false,
                    where: {
                        is_delete: false,
                    },
                    include: {
                        model: survey_result,
                        required: false,
                        attributes: [ ],
                    },
                },
            },
            group: [ "survey_group.id", "survey_questions.id", "survey_questions->survey_choices.id", "type" ],
        });

        //reformat result
        result = {
            survey_id: result.dataValues.id,
            name: result.dataValues.name,
            description: result.dataValues.description,
            question: result.dataValues.survey_questions.map(element => {
                return {
                    question_id: element.dataValues.id,
                    question: element.dataValues.question,
                    description: element.dataValues.description,
                    choice: element.dataValues.survey_choices.map(element2 => {
                        return {
                            choice_id: element2.dataValues.id,
                            choice: element2.dataValues.choice,
                            type: element2.dataValues.type,
                            description: element2.dataValues.description,
                            count: element2.dataValues.count,
                        };
                    }),
                };
            }),
        };

        //add input string
        let input_string = await survey_result.findAll({
            attributes: [ "survey_question_id", "survey_choice_id", "result" ],
            where: {
                survey_group_id: survey_id,
            },
            include: {
                model: survey_choice,
                attributes: [ ],
                where: {
                    type: "input",
                },
            },
        });
        input_string = input_string.map(element => element.dataValues);

        for (let i = 0; i < result.question.length; i++) {
            for (let j = 0; j < result.question[i].choice.length; j++) {
                if (result.question[i].choice[j].type == "input") {
                    result.question[i].choice[j].input_string = input_string
                    .filter(element => element.survey_question_id == result.question[i].question_id && element.survey_choice_id == result.question[i].choice[j].choice_id)
                    .map(element => element.result);
                }
            }
        }

        //send response
        return res.json({
            result,
        });
    } catch(err) {
        return res.status(404).json({ message: "not found" });
    }
});

router.get("/is_survey", async (req, res) => {
    try {
        const { survey_id, user_id } = req.query;

        if (!survey_id || !user_id) {
            return res.status(400).json({ message: "require survey_id and user_id" });
        }

        let count = await survey_result.count({
            where: {
                survey_group_id: survey_id,
                user_id: user_id,
            },
        });

        // user already done survey
        if (count > 0) {
            return res.json({ is_survey: true });
        }

        // user didn't do survey
        return res.json({ is_survey: false });
    } catch(err) {
        return res.status(404).json({ message: "not found" });
    }
});

router.get("/available", async (req, res) => {
    try {
        const { user_id, survey_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ message: "require user_id" });
        }

        if (!survey_id) {
            return res.status(200).json([]);
        }

        let available = await survey_group.findAll({
            attributes: [ ["id", "survey_id"] ],
            raw: true,
            where: {
                id: {
                    [Op.in]: survey_id,
                    [Op.notIn]: sequelize.literal(`(select distinct survey_group_id as id from survey_results where survey_group_id in (${survey_id}) and user_id = ${user_id})`),
                },
            },
        });

        return res.json({ survey_id: available.map(element => element.survey_id) });
    } catch(err) {
        return res.status(404).json({ message: "not found" });
    }
});

router.post("/live_survey", async (req, res) => {
    try {
        let response = await axios.post(survey_ip + "/survey/create", req.body, { params: req.query });

        req.query.survey_id = response.data.survey.group_id;

        await axios.post(live_ip + "/live/survey", {}, { params: req.query });

        return res.status(200).json({ message: "success" });
    } catch(err) {
        return res.status(err.response.status || 404).json(err.response.data || { message: "not found" });
    }
});

module.exports = router;
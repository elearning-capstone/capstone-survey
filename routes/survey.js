const express = require("express");
const router = express.Router();
const { survey_group, survey_question, survey_choice, survey_result } = require("../models");

router.post("/create", async (req, res) => {
    try {
        //verify request
        const { group, description, question } = req.body;

        if (!group) {
            return res.status(400).json({ message: "invalid body1" });
        }

        if (Array.isArray(question)) {
            question.forEach(element => {
                if (!element.question) {
                    return res.status(400).json({ message: "invalid body2" });
                }

                if (Array.isArray(element.choice)) {
                    element.choice.forEach(element2 => {
                        if (!element2.choice || !element2.type) {
                            return res.status(400).json({ message: "invalid body3" });
                        }

                        if(element2.type != "checkbox" && element2.type != "select" && element2.type != "input") {
                            return res.status(400).json({ message: "invalid body4" });
                        }
                    });
                } else if (element.choice) {
                    return res.status(400).json({ message: "invalid body5" });
                }
            });
        } else if (question) {
            return res.status(400).json({ message: "invalid body6" });
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
        const { group_id } = req.query;

        let count = await survey_group.count({
            where: {
                id: group_id,
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
                id: group_id,
                is_delete: false,
            },
            include: {
                model: survey_question,
                attributes: [ "question", "description" ],
                required: false,
                where: {
                    is_delete: false,
                },
                include: {
                    model: survey_choice,
                    attributes: [ "choice", "type", "description" ],
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
                        question: element.dataValues.question,
                        description: element.dataValues.description,
                        choice: element.dataValues.survey_choices.map(element2 => {
                            return {
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

module.exports = router;
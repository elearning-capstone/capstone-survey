const express = require("express");
const router = express.Router();
const { survey_group, survey_question, survey_choice, survey_result } = require("../models");

router.post("/create", async (req, res) => {
    try {
        //TODO
        //verify request
        

        //send database query


        return res.json({
            message: "unimplemented"
        });
    } catch(err) {
        return res.status(404).json({ message: "not found" });
    }
});

module.exports = router;
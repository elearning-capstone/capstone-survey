module.exports = (sequelize, DataTypes) => {
    const survey_question = sequelize.define("survey_question", {
        question: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        description: {
            type: DataTypes.STRING,
            defaultValue: null,
        },
        is_delete: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    });

    survey_question.associate = (models) => {
        survey_question.belongsTo(models.survey_group, {
            foreignKey: "survey_group_id",
        });
        survey_question.hasMany(models.survey_choice, {
            foreignKey: "survey_question_id",
        });
        survey_question.hasMany(models.survey_result, {
            foreignKey: "survey_question_id",
        });
    };

    return survey_question;
}
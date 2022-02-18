module.exports = (sequelize, DataTypes) => {
    const survey_choice = sequelize.define("survey_choice", {
        choice: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        type: {
            type: DataTypes.ENUM("checkbox", "select", "input"),
            defaultValue: "input",
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

    survey_choice.associate = (models) => {
        survey_choice.belongsTo(models.survey_question, {
            foreignKey: "survey_question_id",
        });
        survey_choice.hasMany(models.survey_result, {
            foreignKey: "survey_choice_id",
        });
    };

    return survey_choice;
}
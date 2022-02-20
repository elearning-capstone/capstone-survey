module.exports = (sequelize, DataTypes) => {
    const survey_result = sequelize.define("survey_result", {
        survey_group_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        survey_question_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        survey_choice_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        result: {
            type: DataTypes.STRING,
            defaultValue: null,
        }
    });

    survey_result.associate = (models) => {
        survey_result.belongsTo(models.survey_question, {
            foreignKey: "survey_question_id",
        });
        survey_result.hasMany(models.survey_result, {
            foreignKey: "survey_result_id",
        });
    };

    return survey_result;
}
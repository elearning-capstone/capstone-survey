module.exports = (sequelize, DataTypes) => {
    const survey_group = sequelize.define("survey_group", {
        name: {
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

    survey_group.associate = (models) => {
        survey_group.hasMany(models.survey_question, {
            foreignKey: "survey_group_id",
        });
        survey_group.hasMany(models.survey_result, {
            foreignKey: "survey_group_id",
        });
    };

    return survey_group;
}
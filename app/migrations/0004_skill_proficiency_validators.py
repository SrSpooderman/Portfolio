import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0003_webweaver_branding"),
    ]

    operations = [
        migrations.AlterField(
            model_name="skill",
            name="proficiency",
            field=models.PositiveSmallIntegerField(
                default=0,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100),
                ],
            ),
        ),
    ]

from django.db import models


class Profile(models.Model):
    name = models.CharField(max_length=120)
    headline = models.CharField(max_length=160, blank=True)
    bio = models.TextField()
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    cv_file = models.FileField(upload_to="cv/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class SocialMedia(models.Model):
    profile = models.ForeignKey(
        Profile,
        related_name="social_media",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    platform = models.CharField(max_length=80)
    url = models.URLField(max_length=500)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "platform"]
        unique_together = ("profile", "platform")

    def __str__(self):
        return self.platform


class SkillCategory(models.Model):
    category_name = models.CharField(max_length=100, unique=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "category_name"]
        verbose_name_plural = "skill categories"

    def __str__(self):
        return self.category_name


class Skill(models.Model):
    name = models.CharField(max_length=100)
    proficiency = models.PositiveSmallIntegerField(default=0)
    category = models.ForeignKey(
        SkillCategory,
        related_name="skills",
        on_delete=models.PROTECT,
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["category__order", "order", "name"]
        unique_together = ("name", "category")

    def __str__(self):
        return self.name


class Project(models.Model):
    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    description = models.TextField()
    github_url = models.URLField(max_length=500, blank=True)
    demo_url = models.URLField(max_length=500, blank=True)
    featured = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    skills = models.ManyToManyField(Skill, through="ProjectSkill", related_name="projects")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return self.title


class ProjectSkill(models.Model):
    project = models.ForeignKey(Project, related_name="project_skills", on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, related_name="project_skills", on_delete=models.CASCADE)

    class Meta:
        unique_together = ("project", "skill")

    def __str__(self):
        return f"{self.project} - {self.skill}"


class ProjectMedia(models.Model):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"

    MEDIA_TYPE_CHOICES = (
        (IMAGE, "Image"),
        (VIDEO, "Video"),
        (DOCUMENT, "Document"),
    )

    project = models.ForeignKey(Project, related_name="media", on_delete=models.CASCADE)
    media_url = models.URLField(max_length=500)
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES, default=IMAGE)
    alt_text = models.CharField(max_length=180, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.project} {self.media_type}"

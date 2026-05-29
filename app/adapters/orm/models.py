from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class VisualTheme(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=100, unique=True)
    primary_color = models.CharField(max_length=7, default="#155bb5")
    secondary_color = models.CharField(max_length=7, default="#1849a9")
    accent_color = models.CharField(max_length=7, default="#eef4ff")
    background_color = models.CharField(max_length=7, default="#f7f8fa")
    surface_color = models.CharField(max_length=7, default="#ffffff")
    text_color = models.CharField(max_length=7, default="#172033")
    muted_text_color = models.CharField(max_length=7, default="#667085")
    border_color = models.CharField(max_length=7, default="#dfe4ea")
    card_radius = models.PositiveSmallIntegerField(
        default=8,
        validators=[MinValueValidator(0), MaxValueValidator(32)],
    )
    content_width = models.PositiveSmallIntegerField(
        default=920,
        validators=[MinValueValidator(680), MaxValueValidator(1440)],
    )
    font_family = models.CharField(
        max_length=160,
        default='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    )
    is_default = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        color_fields = [
            "primary_color",
            "secondary_color",
            "accent_color",
            "background_color",
            "surface_color",
            "text_color",
            "muted_text_color",
            "border_color",
        ]
        for field in color_fields:
            value = getattr(self, field)
            if (
                len(value) != 7
                or not value.startswith("#")
                or any(char not in "0123456789abcdefABCDEF" for char in value[1:])
            ):
                raise ValidationError({field: "Usa un color hexadecimal en formato #RRGGBB."})
        if any(char in self.font_family for char in "{};<>"):
            raise ValidationError({"font_family": "La fuente contiene caracteres no permitidos."})

    def save(self, *args, **kwargs):
        if self.is_default:
            VisualTheme.objects.exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)
        if self.is_default:
            SiteSettings.objects.update(visual_theme=self)


class SiteSettings(models.Model):
    site_name = models.CharField(max_length=120, default="WebWeaver")
    owner_name = models.CharField(max_length=120, default="Your Name")
    role_title = models.CharField(max_length=160, default="Portfolio Builder")
    hero_eyebrow = models.CharField(max_length=80, default="WebWeaver")
    logo_path = models.CharField(max_length=255, default="img/brand/webweaberLogo.svg")
    favicon_path = models.CharField(max_length=255, default="img/brand/webweaberLogo.svg")
    visual_theme = models.ForeignKey(
        VisualTheme,
        related_name="site_settings",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    meta_description = models.CharField(
        max_length=255,
        default="Portfolio profesional editable con Django y WebWeaver.",
    )
    meta_author = models.CharField(max_length=120, blank=True)
    about_title = models.CharField(max_length=80, default="Sobre mí")
    skills_title = models.CharField(max_length=80, default="Tecnologías")
    projects_title = models.CharField(max_length=80, default="Proyectos")
    learning_title = models.CharField(max_length=80, default="Aprendizaje")
    contact_title = models.CharField(max_length=80, default="Contacto")
    project_detail_title = models.CharField(max_length=80, default="Descripción")
    media_title = models.CharField(max_length=80, default="Media")
    featured_label = models.CharField(max_length=40, default="Destacado")
    project_detail_link_label = models.CharField(max_length=60, default="Ver detalle")
    github_label = models.CharField(max_length=40, default="GitHub")
    demo_label = models.CharField(max_length=40, default="Demo")
    cv_label = models.CharField(max_length=40, default="CV")
    email_label = models.CharField(max_length=40, default="Email")
    phone_label = models.CharField(max_length=40, default="Teléfono")
    empty_skills_message = models.CharField(
        max_length=180,
        default="Añade categorías y tecnologías desde el backoffice para mostrarlas aquí.",
    )
    empty_about_message = models.CharField(
        max_length=180,
        default="Edita el perfil desde el backoffice para mostrar una biografía aquí.",
    )
    empty_projects_message = models.CharField(
        max_length=180,
        default="Añade proyectos desde el backoffice para mostrarlos aquí.",
    )
    empty_category_message = models.CharField(
        max_length=180,
        default="Sin tecnologías en esta categoría.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "site settings"
        verbose_name_plural = "site settings"

    def __str__(self):
        return self.site_name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.visual_theme_id:
            VisualTheme.objects.exclude(pk=self.visual_theme_id).update(is_default=False)
            VisualTheme.objects.filter(pk=self.visual_theme_id).update(is_default=True)

    @property
    def active_theme(self):
        default_theme = VisualTheme.objects.filter(is_default=True).first()
        if default_theme:
            return default_theme
        if self.visual_theme_id:
            return self.visual_theme
        return VisualTheme.objects.first()


class Page(models.Model):
    title = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120, unique=True)
    is_home = models.BooleanField(default=False)
    visible = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.is_home:
            Page.objects.exclude(pk=self.pk).update(is_home=False)
        super().save(*args, **kwargs)


class PageSection(models.Model):
    HERO = "hero"
    ABOUT = "about"
    SKILLS = "skills"
    PROJECTS = "projects"
    LEARNING = "learning"
    CONTACT = "contact"
    CUSTOM_NOTE = "custom_note"

    SECTION_TYPE_CHOICES = (
        (HERO, "Hero"),
        (ABOUT, "About"),
        (SKILLS, "Skills"),
        (PROJECTS, "Projects"),
        (LEARNING, "Learning"),
        (CONTACT, "Contact"),
        (CUSTOM_NOTE, "Custom note"),
    )

    SIMPLE = "simple"
    COMPACT = "compact"
    EDITORIAL = "editorial"
    GRID = "grid"
    LIST = "list"
    FEATURED = "featured"

    LAYOUT_VARIANT_CHOICES = (
        (SIMPLE, "Simple"),
        (COMPACT, "Compacta"),
        (EDITORIAL, "Editorial"),
        (GRID, "Grid"),
        (LIST, "Lista"),
        (FEATURED, "Destacada"),
    )

    page = models.ForeignKey(Page, related_name="sections", on_delete=models.CASCADE)
    section_type = models.CharField(max_length=30, choices=SECTION_TYPE_CHOICES)
    title = models.CharField(max_length=120, blank=True)
    anchor = models.SlugField(max_length=80)
    visible = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    layout_variant = models.CharField(
        max_length=30,
        choices=LAYOUT_VARIANT_CHOICES,
        default=SIMPLE,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        unique_together = ("page", "anchor")

    def __str__(self):
        return f"{self.page} / {self.get_section_type_display()}"


class ContentBlock(models.Model):
    TEXT = "text"
    IMAGE = "image"
    CTA = "cta"
    SKILL_LIST = "skill_list"
    FEATURED_PROJECTS = "featured_projects"
    CONTACT_LINKS = "contact_links"

    BLOCK_TYPE_CHOICES = (
        (TEXT, "Texto"),
        (IMAGE, "Imagen"),
        (CTA, "CTA"),
        (SKILL_LIST, "Lista de tecnologias"),
        (FEATURED_PROJECTS, "Proyectos destacados"),
        (CONTACT_LINKS, "Contacto y enlaces"),
    )

    PRIMARY = "primary"
    SECONDARY = "secondary"
    LINK = "link"

    CTA_STYLE_CHOICES = (
        (PRIMARY, "Primario"),
        (SECONDARY, "Secundario"),
        (LINK, "Enlace"),
    )

    section = models.ForeignKey(PageSection, related_name="blocks", on_delete=models.CASCADE)
    block_type = models.CharField(max_length=30, choices=BLOCK_TYPE_CHOICES, default=TEXT)
    title = models.CharField(max_length=140, blank=True)
    body = models.TextField(blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    alt_text = models.CharField(max_length=180, blank=True)
    cta_label = models.CharField(max_length=80, blank=True)
    cta_url = models.CharField(max_length=500, blank=True)
    cta_style = models.CharField(max_length=20, choices=CTA_STYLE_CHOICES, default=PRIMARY)
    open_new_tab = models.BooleanField(default=False)
    visible = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.title or self.get_block_type_display()

    def clean(self):
        super().clean()
        if self.block_type == self.TEXT and not (self.title.strip() or self.body.strip()):
            raise ValidationError("Un bloque de texto necesita titulo o cuerpo.")
        if self.block_type == self.IMAGE:
            errors = {}
            if not self.image_url:
                errors["image_url"] = "Un bloque de imagen necesita URL."
            if not self.alt_text.strip():
                errors["alt_text"] = "Un bloque de imagen necesita texto alternativo."
            if errors:
                raise ValidationError(errors)
        if self.block_type == self.CTA and not (self.cta_label.strip() and self.cta_url.strip()):
            raise ValidationError("Un CTA necesita label y URL.")


class HeroSettings(models.Model):
    PROFILE = "profile"
    MANUAL = "manual"
    MIXED = "mixed"

    CONTENT_SOURCE_CHOICES = (
        (PROFILE, "Perfil"),
        (MANUAL, "Manual"),
        (MIXED, "Mezcla"),
    )

    LEFT = "left"
    CENTER = "center"
    RIGHT = "right"

    ALIGNMENT_CHOICES = (
        (LEFT, "Izquierda"),
        (CENTER, "Centro"),
        (RIGHT, "Derecha"),
    )

    SIMPLE = "simple"
    IMAGE = "image"
    CENTERED = "centered"
    SPLIT = "split"
    COMPACT = "compact"

    VARIANT_CHOICES = (
        (SIMPLE, "Simple"),
        (IMAGE, "Con imagen"),
        (CENTERED, "Centrado"),
        (SPLIT, "Lateral"),
        (COMPACT, "Compacto"),
    )

    AUTO = "auto"
    SHORT = "short"
    TALL = "tall"
    FULL = "full"

    HEIGHT_CHOICES = (
        (AUTO, "Automatica"),
        (SHORT, "Baja"),
        (TALL, "Alta"),
        (FULL, "Pantalla completa"),
    )

    TIGHT = "tight"
    NORMAL = "normal"
    SPACIOUS = "spacious"

    SPACING_CHOICES = (
        (TIGHT, "Compacto"),
        (NORMAL, "Normal"),
        (SPACIOUS, "Amplio"),
    )

    section = models.OneToOneField(
        PageSection,
        related_name="hero_settings",
        on_delete=models.CASCADE,
    )
    content_source = models.CharField(max_length=20, choices=CONTENT_SOURCE_CHOICES, default=MIXED)
    eyebrow = models.CharField(max_length=90, blank=True)
    title = models.CharField(max_length=140, blank=True)
    subtitle = models.TextField(blank=True)
    show_logo = models.BooleanField(default=True)
    background_image_url = models.URLField(max_length=500, blank=True)
    image_alt_text = models.CharField(max_length=180, blank=True)
    alignment = models.CharField(max_length=20, choices=ALIGNMENT_CHOICES, default=LEFT)
    variant = models.CharField(max_length=20, choices=VARIANT_CHOICES, default=SIMPLE)
    height = models.CharField(max_length=20, choices=HEIGHT_CHOICES, default=AUTO)
    spacing = models.CharField(max_length=20, choices=SPACING_CHOICES, default=NORMAL)
    primary_cta_label = models.CharField(max_length=80, blank=True)
    primary_cta_url = models.CharField(max_length=500, blank=True)
    primary_cta_new_tab = models.BooleanField(default=False)
    secondary_cta_label = models.CharField(max_length=80, blank=True)
    secondary_cta_url = models.CharField(max_length=500, blank=True)
    secondary_cta_new_tab = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "hero settings"
        verbose_name_plural = "hero settings"

    def __str__(self):
        return f"Hero: {self.section}"

    def clean(self):
        super().clean()
        errors = {}
        if self.section_id and self.section.section_type != PageSection.HERO:
            errors["section"] = "La configuracion de hero solo puede asociarse a una seccion Hero."
        if self.background_image_url and not self.image_alt_text.strip():
            errors["image_alt_text"] = "La imagen del hero necesita texto alternativo."
        if bool(self.primary_cta_label.strip()) != bool(self.primary_cta_url.strip()):
            errors["primary_cta_label"] = "El CTA principal necesita label y URL."
            errors["primary_cta_url"] = "El CTA principal necesita label y URL."
        if bool(self.secondary_cta_label.strip()) != bool(self.secondary_cta_url.strip()):
            errors["secondary_cta_label"] = "El CTA secundario necesita label y URL."
            errors["secondary_cta_url"] = "El CTA secundario necesita label y URL."
        if errors:
            raise ValidationError(errors)


class NavigationItem(models.Model):
    label = models.CharField(max_length=80)
    url = models.CharField(max_length=255)
    open_new_tab = models.BooleanField(default=False)
    visible = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "label"]

    def __str__(self):
        return self.label


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
    proficiency = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
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


class LearningItem(models.Model):
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    url = models.URLField(max_length=500, blank=True)
    visible = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()
        if self.visible and not self.description.strip() and not self.url:
            raise ValidationError(
                "Un recurso de aprendizaje visible necesita una descripcion o una URL."
            )


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

    def clean(self):
        super().clean()
        if self.featured and not (self.github_url or self.demo_url):
            raise ValidationError(
                "Un proyecto destacado necesita una URL de GitHub o una demo publica."
            )


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

    def clean(self):
        super().clean()
        if not self.media_url:
            raise ValidationError("El recurso multimedia necesita una URL.")
        if self.media_type == self.IMAGE and not self.alt_text.strip():
            raise ValidationError("Las imagenes necesitan texto alternativo.")

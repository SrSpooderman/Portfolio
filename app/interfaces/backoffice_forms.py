from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import Group, User

from app.adapters.orm.models import (
    ContentBlock,
    HeroSettings,
    LearningItem,
    NavigationItem,
    Page,
    PageSection,
    Profile,
    Project,
    ProjectMedia,
    ProjectSkill,
    SiteSettings,
    Skill,
    SkillCategory,
    SocialMedia,
    VisualTheme,
)


class BackofficeFormMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            if isinstance(field.widget, forms.CheckboxInput):
                field.widget.attrs.setdefault("class", "check-input")
            else:
                field.widget.attrs.setdefault("class", "field-input")


class SiteSettingsForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = SiteSettings
        exclude = ["updated_at"]
        widgets = {
            "meta_description": forms.Textarea(attrs={"rows": 3}),
            "empty_about_message": forms.Textarea(attrs={"rows": 2}),
            "empty_skills_message": forms.Textarea(attrs={"rows": 2}),
            "empty_projects_message": forms.Textarea(attrs={"rows": 2}),
            "empty_category_message": forms.Textarea(attrs={"rows": 2}),
        }


class VisualThemeForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = VisualTheme
        fields = [
            "name",
            "slug",
            "primary_color",
            "secondary_color",
            "accent_color",
            "background_color",
            "surface_color",
            "text_color",
            "muted_text_color",
            "border_color",
            "card_radius",
            "content_width",
            "font_family",
            "order",
        ]
        widgets = {
            "primary_color": forms.TextInput(attrs={"type": "color"}),
            "secondary_color": forms.TextInput(attrs={"type": "color"}),
            "accent_color": forms.TextInput(attrs={"type": "color"}),
            "background_color": forms.TextInput(attrs={"type": "color"}),
            "surface_color": forms.TextInput(attrs={"type": "color"}),
            "text_color": forms.TextInput(attrs={"type": "color"}),
            "muted_text_color": forms.TextInput(attrs={"type": "color"}),
            "border_color": forms.TextInput(attrs={"type": "color"}),
        }


class PageForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = Page
        fields = ["title", "slug", "is_home", "visible", "order"]


class PageSectionForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = PageSection
        fields = ["page", "section_type", "title", "anchor", "visible", "order", "layout_variant"]
        labels = {
            "page": "Pagina",
            "section_type": "Tipo de seccion",
            "title": "Titulo visible",
            "anchor": "Anchor para navegacion",
            "visible": "Visible en la web",
            "order": "Orden",
            "layout_variant": "Composicion",
        }
        help_texts = {
            "anchor": "Ejemplo: projects. La navegacion interna usara #projects.",
            "order": "Numeros mas bajos aparecen antes.",
            "layout_variant": "Cambia la composicion sin tocar el contenido.",
        }


class ContentBlockForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = ContentBlock
        fields = [
            "section",
            "block_type",
            "title",
            "body",
            "image_url",
            "alt_text",
            "cta_label",
            "cta_url",
            "cta_style",
            "open_new_tab",
            "visible",
            "order",
        ]
        widgets = {"body": forms.Textarea(attrs={"rows": 5})}
        labels = {
            "section": "Seccion donde aparece",
            "block_type": "Tipo de bloque",
            "title": "Titulo",
            "body": "Texto",
            "image_url": "URL de imagen",
            "alt_text": "Texto alternativo",
            "cta_label": "Texto del boton",
            "cta_url": "URL del boton",
            "cta_style": "Estilo del CTA",
            "open_new_tab": "Abrir en nueva pestana",
            "visible": "Visible en la web",
            "order": "Orden dentro de la seccion",
        }
        help_texts = {
            "section": "El bloque se renderiza dentro de esta seccion del portfolio.",
            "body": "Para notas profesionales o pequenos textos introductorios.",
            "image_url": "Por ahora usa una URL publica de imagen.",
            "alt_text": "Describe la imagen para accesibilidad.",
            "cta_url": "Puede ser una URL completa, un mailto: o un anchor como #contact.",
            "order": "Numeros mas bajos aparecen antes dentro de la misma seccion.",
        }


class HeroSettingsForm(BackofficeFormMixin, forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["section"].queryset = PageSection.objects.filter(section_type=PageSection.HERO)

    class Meta:
        model = HeroSettings
        fields = [
            "section",
            "content_source",
            "eyebrow",
            "title",
            "subtitle",
            "show_logo",
            "background_image_url",
            "image_alt_text",
            "alignment",
            "variant",
            "height",
            "spacing",
            "primary_cta_label",
            "primary_cta_url",
            "primary_cta_new_tab",
            "secondary_cta_label",
            "secondary_cta_url",
            "secondary_cta_new_tab",
        ]
        widgets = {"subtitle": forms.Textarea(attrs={"rows": 4})}
        labels = {
            "section": "Seccion Hero",
            "content_source": "Origen del contenido",
            "eyebrow": "Eyebrow",
            "title": "Titulo manual",
            "subtitle": "Subtitulo manual",
            "show_logo": "Mostrar logo",
            "background_image_url": "URL de imagen/fondo",
            "image_alt_text": "Texto alternativo de imagen",
            "alignment": "Alineacion",
            "variant": "Variante visual",
            "height": "Altura",
            "spacing": "Espaciado",
            "primary_cta_label": "CTA principal",
            "primary_cta_url": "URL CTA principal",
            "primary_cta_new_tab": "CTA principal en nueva pestana",
            "secondary_cta_label": "CTA secundario",
            "secondary_cta_url": "URL CTA secundario",
            "secondary_cta_new_tab": "CTA secundario en nueva pestana",
        }
        help_texts = {
            "content_source": "Perfil usa datos de Profile, Manual usa estos campos, Mezcla usa manual si existe y perfil como fallback.",
            "section": "Solo secciones de tipo Hero son validas.",
            "background_image_url": "Activa variantes visuales con imagen o fondo.",
            "height": "Controla la presencia vertical del primer bloque.",
            "spacing": "Ajusta el aire interior del hero.",
        }


class ProfileForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = Profile
        fields = ["name", "headline", "bio", "email", "phone", "cv_file"]
        widgets = {"bio": forms.Textarea(attrs={"rows": 7})}


class NavigationItemForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = NavigationItem
        fields = ["label", "url", "open_new_tab", "visible", "order"]


class SocialMediaForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = SocialMedia
        fields = ["profile", "platform", "url", "order"]


class SkillCategoryForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = SkillCategory
        fields = ["category_name", "order"]


class SkillForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = Skill
        fields = ["name", "proficiency", "category", "order"]


class LearningItemForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = LearningItem
        fields = ["title", "description", "url", "visible", "order"]
        widgets = {"description": forms.Textarea(attrs={"rows": 5})}


class ProjectForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = Project
        fields = ["title", "slug", "description", "github_url", "demo_url", "featured", "order"]
        widgets = {"description": forms.Textarea(attrs={"rows": 8})}


class ProjectSkillForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = ProjectSkill
        fields = ["project", "skill"]


class ProjectMediaForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = ProjectMedia
        fields = ["project", "media_url", "media_type", "alt_text", "order"]


class AdminUserCreateForm(BackofficeFormMixin, UserCreationForm):
    email = forms.EmailField(required=False)

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "is_active"]

    def save(self, commit=True):
        user = super().save(commit=False)
        user.is_staff = True
        user.is_superuser = False
        if commit:
            user.save()
            group, _ = Group.objects.get_or_create(name="Administradores")
            user.groups.add(group)
        return user


class AdminUserEditForm(BackofficeFormMixin, forms.ModelForm):
    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "is_active"]

    def save(self, commit=True):
        user = super().save(commit=False)
        user.is_staff = True
        user.is_superuser = False
        if commit:
            user.save()
            group, _ = Group.objects.get_or_create(name="Administradores")
            user.groups.add(group)
        return user

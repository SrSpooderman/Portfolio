from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import Group, User

from app.adapters.orm.models import (
    LearningItem,
    NavigationItem,
    Profile,
    Project,
    ProjectMedia,
    ProjectSkill,
    SiteSettings,
    Skill,
    SkillCategory,
    SocialMedia,
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

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from app.adapters.orm.models import (
    Profile,
    Project,
    ProjectMedia,
    ProjectSkill,
    LearningItem,
    NavigationItem,
    SiteSettings,
    Skill,
    SkillCategory,
    SocialMedia,
    VisualTheme,
)


class ModelCleanSerializerMixin:
    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = self.instance or self.Meta.model()
        for field, value in attrs.items():
            setattr(instance, field, value)
        try:
            instance.full_clean()
        except DjangoValidationError as exc:
            detail = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            raise serializers.ValidationError(detail) from exc
        return attrs


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = "__all__"
        read_only_fields = ["id", "updated_at"]


class VisualThemeSerializer(ModelCleanSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = VisualTheme
        fields = [
            "id",
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
            "is_default",
            "order",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class NavigationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NavigationItem
        fields = ["id", "label", "url", "open_new_tab", "visible", "order"]
        read_only_fields = ["id"]


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "id",
            "name",
            "headline",
            "bio",
            "email",
            "phone",
            "cv_file",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SocialMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialMedia
        fields = ["id", "profile", "platform", "url", "order"]
        read_only_fields = ["id"]


class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ["id", "category_name", "order"]
        read_only_fields = ["id"]


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id", "name", "proficiency", "category", "order"]
        read_only_fields = ["id"]


class LearningItemSerializer(ModelCleanSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = LearningItem
        fields = ["id", "title", "description", "url", "visible", "order"]
        read_only_fields = ["id"]


class ProjectSerializer(ModelCleanSerializerMixin, serializers.ModelSerializer):
    skills = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "github_url",
            "demo_url",
            "featured",
            "order",
            "skills",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "skills", "created_at", "updated_at"]


class ProjectSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectSkill
        fields = ["id", "project", "skill"]
        read_only_fields = ["id"]


class ProjectMediaSerializer(ModelCleanSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = ProjectMedia
        fields = ["id", "project", "media_url", "media_type", "alt_text", "order"]
        read_only_fields = ["id"]

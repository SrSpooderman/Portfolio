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
)


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = "__all__"
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


class LearningItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningItem
        fields = ["id", "title", "description", "url", "visible", "order"]
        read_only_fields = ["id"]


class ProjectSerializer(serializers.ModelSerializer):
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


class ProjectMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMedia
        fields = ["id", "project", "media_url", "media_type", "alt_text", "order"]
        read_only_fields = ["id"]

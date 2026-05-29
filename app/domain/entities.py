
from dataclasses import dataclass

@dataclass
class SkillCategoryEntity:
    id: int
    category_name: str

@dataclass
class SkillEntity:
    id: int
    name: str
    proficiency: int
    category_id: int

@dataclass
class ProjectSkillEntity:
    project_id: int
    skill_id: int

@dataclass
class ProjectEntity:
    id: int
    title: str
    slug: str
    description: str
    github_url: str = ""
    demo_url: str = ""
    featured: bool = False
    order: int = 0

@dataclass
class ProfileEntity:
    id: int
    name: str
    bio: str
    email: str
    phone: str

@dataclass
class SocialMediaEntity:
    id: int
    platform: str
    url: str

@dataclass
class UserEntity:
    id: int
    username: str
    password: str

@dataclass
class ProjectMediaEntity:
    id: int
    project_id: int
    media_url: str
    media_type: str
    alt_text: str = ""
    order: int = 0


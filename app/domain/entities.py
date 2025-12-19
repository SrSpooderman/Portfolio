
from dataclasses import dataclass
from typing import List

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
class ProyectSkillEntity:
    project_id: int
    skill_id: int

@dataclass
class ProyectEntity:
    id: int
    title: str
    description: str
    github_url: str
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
class ProyectMediaEntity:
    id: int
    project_id: int
    media_url: str
    media_type: str


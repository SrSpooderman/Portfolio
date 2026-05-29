from abc import ABC, abstractmethod


class ProjectSkillRepository(ABC):
    @abstractmethod
    def get_entity_by_id(self, project_skill_id: int):
        pass

    @abstractmethod
    def add_entity(self, project_skill_data: dict):
        pass

    @abstractmethod
    def update_entity(self, project_skill_id: int, project_skill_data: dict):
        pass

    @abstractmethod
    def delete_entity(self, project_skill_id: int):
        pass

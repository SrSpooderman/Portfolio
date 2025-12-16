from abc import ABC, abstractmethod

class SkillRepository(ABC):
    @abstractmethod
    def get_skill_by_id(self, skill_id: int):
        pass

    @abstractmethod
    def add_skill(self, skill_data: dict):
        pass

    @abstractmethod
    def update_skill(self, skill_id: int, skill_data: dict):
        pass

    @abstractmethod
    def delete_skill(self, skill_id: int):
        pass
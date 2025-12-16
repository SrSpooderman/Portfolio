from abc import ABC, abstractmethod

class SkillCategoryRepository(ABC):
    @abstractmethod
    def get_skill_category_by_id(self, category_id: int):
        pass

    @abstractmethod
    def list_skill_categories(self):
        pass

    @abstractmethod
    def add_skill_category(self, category_data: dict):
        pass

    @abstractmethod
    def update_skill_category(self, category_id: int, category_data: dict):
        pass

    @abstractmethod
    def delete_skill_category(self, category_id: int):
        pass
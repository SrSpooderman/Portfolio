from abc import ABC, abstractmethod

class ProyectSkillRepository(ABC):
    @abstractmethod
    def get_entity_by_id(self, proyect_skill_id: int):
        pass

    @abstractmethod
    def add_entity(self, proyect_skill_data: dict):
        pass

    @abstractmethod
    def update_entity(self, proyect_skill_id: int, proyect_skill_data: dict):
        pass

    @abstractmethod
    def delete_entity(self, proyect_skill_id: int):
        pass
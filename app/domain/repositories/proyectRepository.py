from abc import ABC, abstractmethod

class ProyectRepository(ABC):
    @abstractmethod
    def get_entity_by_id(self, proyect_id: int):
        pass

    @abstractmethod
    def add_entity(self, proyect_data: dict):
        pass

    @abstractmethod
    def update_entity(self, proyect_id: int, proyect_data: dict):
        pass

    @abstractmethod
    def delete_entity(self, proyect_id: int):
        pass
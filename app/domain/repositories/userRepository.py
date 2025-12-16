from abc import ABC, abstractmethod

class UserRepository(ABC):
    @abstractmethod
    def get_entity_by_id(self, user_id: int):
        pass

    @abstractmethod
    def add_entity(self, user_data: dict):
        pass

    @abstractmethod
    def update_entity(self, user_id: int, user_data: dict):
        pass

    @abstractmethod
    def delete_entity(self, user_id: int):
        pass
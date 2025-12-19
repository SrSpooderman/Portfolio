from abc import ABC, abstractmethod

class ProfileRepository(ABC):
    @abstractmethod
    def get_profile(self, profile_id: int) -> dict:
        pass

    @abstractmethod
    def update_profile(self, profile_id: int, profile_data: dict) -> None:
        pass

    @abstractmethod
    def delete_profile(self, profile_id: int) -> None:
        pass

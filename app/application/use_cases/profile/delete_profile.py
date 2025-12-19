from app.domain.repositories.profileRepository import ProfileRepository

class DeleteProfile:
    def __init__(self, profile_repository: ProfileRepository):
        self.profile_repository = profile_repository

    def execute(self, profile_id: int) -> None:
        return self.profile_repository.delete_profile(profile_id)
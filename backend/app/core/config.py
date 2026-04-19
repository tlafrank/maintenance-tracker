from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    database_url: str = 'postgresql+psycopg://maintenance:maintenance@db:5432/maintenance'
    jwt_secret_key: str = 'change-me'
    jwt_algorithm: str = 'HS256'
    jwt_access_token_expire_minutes: int = 525600
    cors_origins: str = 'http://localhost:5173'


settings = Settings()

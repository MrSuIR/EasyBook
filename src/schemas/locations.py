from pydantic import BaseModel


class LocationSuggestion(BaseModel):
    city: str
    country: str
    label: str

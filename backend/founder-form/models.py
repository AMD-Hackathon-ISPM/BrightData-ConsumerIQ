from typing import List
from pydantic import BaseModel, Field

class FounderFormPayload(BaseModel):
    fullName: str = ''
    workEmail: str = ''
    password: str = ''
    workspaceName: str = ''
    industry: str = ''
    region: str = ''
    marketplace: str = ''
    competitors: List[str] = Field(default_factory=list)
    searchIntentKeywords: List[str] = Field(default_factory=list)
    customerSegment: str = ''
    painPoint: str = ''
    priceRangeMin: int = 0
    priceRangeMax: int = 0

class FounderFormRecord(FounderFormPayload):
    id: str
    status: str
    createdAt: str

class FounderFormResponse(BaseModel):
    id: str
    status: str

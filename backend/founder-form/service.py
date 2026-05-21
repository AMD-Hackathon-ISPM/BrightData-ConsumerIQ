from datetime import datetime, timezone
from uuid import uuid4
from .models import FounderFormPayload, FounderFormRecord
from .store import FounderFormStore

class FounderFormService:
    def __init__(self, store: FounderFormStore) -> None:
        self.store = store

    def submitForm(self, payload: FounderFormPayload) -> FounderFormRecord:
        formId = str(uuid4())
        record = FounderFormRecord(
            id=formId,
            status='received',
            createdAt=datetime.now(timezone.utc).isoformat(),
            **payload.model_dump(),
        )
        return self.store.createRecord(record)

    def getForm(self, formId: str) -> FounderFormRecord | None:
        return self.store.getRecord(formId)

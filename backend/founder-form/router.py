import sys
from pathlib import Path as FsPath
from fastapi import APIRouter, HTTPException, Path

basePath = FsPath(__file__).parent
if str(basePath) not in sys.path:
    sys.path.insert(0, str(basePath))

from models import FounderFormPayload, FounderFormRecord, FounderFormResponse
from service import FounderFormService
from store import FounderFormStore

store = FounderFormStore()
service = FounderFormService(store)
router = APIRouter(prefix='/api/founder-form', tags=['founderForm'])

@router.post('/submit', response_model=FounderFormResponse)
def submitFounderForm(payload: FounderFormPayload) -> FounderFormResponse:
    record = service.submitForm(payload)
    return FounderFormResponse(id=record.id, status=record.status)

@router.get('/{form_id}', response_model=FounderFormRecord)
def getFounderForm(formId: str = Path(..., alias='form_id')) -> FounderFormRecord:
    record = service.getForm(formId)
    if record is None:
        raise HTTPException(status_code=404, detail='Founder form not found')
    return record

import json
import os
from typing import List, Optional
import psycopg2
from .models import FounderFormRecord

class FounderFormStore:
    def __init__(self) -> None:
        self.dbHost = os.getenv('POSTGRES_HOST', 'postgres')
        self.dbPort = int(os.getenv('POSTGRES_PORT', '5432'))
        self.dbName = os.getenv('POSTGRES_DB', 'consumeriq')
        self.dbUser = os.getenv('POSTGRES_USER', 'consumeriq')
        self.dbPassword = os.getenv('POSTGRES_PASSWORD', 'consumeriq')
        self.ensureSchema()

    def getConnection(self):
        return psycopg2.connect(
            host=self.dbHost,
            port=self.dbPort,
            dbname=self.dbName,
            user=self.dbUser,
            password=self.dbPassword,
        )

    def ensureSchema(self) -> None:
        with self.getConnection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    'create table if not exists founderForms ('
                    'id text primary key,'
                    'status text not null,'
                    'createdAt timestamptz not null,'
                    'payload jsonb not null'
                    ')'
                )
            connection.commit()

    def createRecord(self, record: FounderFormRecord) -> FounderFormRecord:
        payload = json.dumps(record.model_dump())
        with self.getConnection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    'insert into founderForms (id, status, createdAt, payload) values (%s, %s, %s, %s)',
                    (record.id, record.status, record.createdAt, payload),
                )
            connection.commit()
        return record

    def getRecord(self, formId: str) -> Optional[FounderFormRecord]:
        with self.getConnection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    'select payload from founderForms where id = %s',
                    (formId,),
                )
                row = cursor.fetchone()
        if row is None:
            return None
        data = json.loads(row[0])
        return FounderFormRecord(**data)

    def listRecords(self) -> List[FounderFormRecord]:
        with self.getConnection() as connection:
            with connection.cursor() as cursor:
                cursor.execute('select payload from founderForms')
                rows = cursor.fetchall()
        return [FounderFormRecord(**json.loads(row[0])) for row in rows]

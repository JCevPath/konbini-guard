import os
import psycopg

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/konbiniguard"
)

def get_connection():
    return psycopg.connect(DATABASE_URL)
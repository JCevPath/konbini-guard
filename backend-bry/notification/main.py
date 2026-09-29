import os
from fastapi import FastAPI, HTTPException
from psycopg.rows import dict_row
import psycopg

app = FastAPI(title="KonbiniGuard Notification API")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/konbiniguard"
)


def get_connection():
    return psycopg.connect(DATABASE_URL)


@app.get("/health")
def health():
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
        return {"status": "ok", "service": "notification"}
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Notification service database connection failed"
        )


@app.get("/api/notifications/alerts")
def get_active_alerts():
    """Fetches all food batches currently requiring staff attention."""
    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT 
                        fb.batch_id,
                        fb.item_id,
                        m.item_name,
                        fb.status,
                        fb.expires_at
                    FROM food_batches fb
                    JOIN menu m ON fb.item_id = m.item_id
                    WHERE fb.status IN ('NEAR_EXPIRY', 'EXPIRED')
                    ORDER BY fb.expires_at ASC;
                """)
                alerts = cursor.fetchall()
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch alerts: {str(e)}"
        )
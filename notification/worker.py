import os
import time
from datetime import datetime, timezone
import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@db:5432/konbiniguard"
)

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")


def get_connection():
    return psycopg.connect(DATABASE_URL)


def run_expiration_check():
    """Scans batch_logs and updates statuses for near-expiry or expired items."""
    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                now = datetime.now(timezone.utc)

                cursor.execute("""
                    SELECT id AS batch_id, item_id, status, expires_at 
                    FROM batch_logs 
                    WHERE status IN ('FRESH', 'NEAR_EXPIRY');
                """)
                batches = cursor.fetchall()

                for batch in batches:
                    expires_at = batch["expires_at"]
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)

                    time_left_seconds = (expires_at - now).total_seconds()
                    new_status = None

                    if time_left_seconds <= 0 and batch["status"] != "EXPIRED":
                        new_status = "EXPIRED"
                    elif 0 < time_left_seconds <= 600 and batch["status"] == "FRESH":
                        new_status = "NEAR_EXPIRY"

                    if new_status:
                        cursor.execute("""
                            UPDATE batch_logs 
                            SET status = %s 
                            WHERE id = %s;
                        """, (new_status, batch["batch_id"]))

                        cursor.execute("""
                            INSERT INTO logs (batch_id, action_type, info)
                            VALUES (%s, %s, %s);
                        """, (
                            batch["batch_id"],
                            f"ALERT_{new_status}",
                            f"Batch #{batch['batch_id']} marked as {new_status}"
                        ))

                        conn.commit()
                        print(f"[{datetime.now().isoformat()}] Batch #{batch['batch_id']} updated to {new_status}")

    except Exception as e:
        print(f"[Worker Error]: {e}")


if __name__ == "__main__":
    print("Expiration Guard Worker started. Scanning database every 10 seconds.")
    while True:
        run_expiration_check()
        time.sleep(10)
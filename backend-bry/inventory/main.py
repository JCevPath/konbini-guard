from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from psycopg.rows import dict_row
from database import get_connection

app = FastAPI(title="KonbiniGuard Inventory API")


class BatchCreate(BaseModel):
    item_id: int
    amount: int = Field(gt=0, description="Amount must be greater than 0")


@app.get("/health")
def health():
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")

        return {"status": "ok"}

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed"
        )


@app.get("/api/inventory")
def get_inventory():
    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT 
                        fb.batch_id,
                        fb.item_id,
                        m.item_name,
                        fb.amount,
                        fb.status,
                        fb.cooked_at,
                        fb.expires_at
                    FROM food_batches fb
                    JOIN menu m ON fb.item_id = m.item_id
                    ORDER BY fb.batch_id DESC;
                """)
                inventory = cursor.fetchall()

        return inventory

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch inventory: {str(e)}"
        )


@app.post("/api/inventory", status_code=status.HTTP_201_CREATED)
def create_batch(payload: BatchCreate):
    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                # 1. Check if menu item exists and get shelf life (max_minutes)
                cursor.execute(
                    "SELECT item_name, max_minutes FROM menu WHERE item_id = %s;",
                    (payload.item_id,)
                )
                menu_item = cursor.fetchone()

                if not menu_item:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Menu item with ID {payload.item_id} not found"
                    )

                # 2. Compute expiration time
                cooked_at = datetime.now()
                expires_at = cooked_at + timedelta(minutes=menu_item["max_minutes"])

                # 3. Insert new food batch
                cursor.execute("""
                    INSERT INTO food_batches (item_id, amount, status, cooked_at, expires_at)
                    VALUES (%s, %s, 'FRESH', %s, %s)
                    RETURNING batch_id, item_id, amount, status, cooked_at, expires_at;
                """, (payload.item_id, payload.amount, cooked_at, expires_at))
                new_batch = cursor.fetchone()

                # 4. Record action in audit logs
                cursor.execute("""
                    INSERT INTO logs (batch_id, action_type, info)
                    VALUES (%s, 'COOK_BATCH', %s);
                """, (
                    new_batch["batch_id"],
                    f"Cooked {payload.amount} units of {menu_item['item_name']}"
                ))

                conn.commit()

                # Attach item_name to response
                new_batch["item_name"] = menu_item["item_name"]
                return new_batch

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create inventory batch: {str(e)}"
        )

@app.patch("/api/inventory/{batch_id}/discard")
def discard_batch(batch_id: int):
    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                # 1. Check if the batch exists
                cursor.execute(
                    "SELECT batch_id, status FROM food_batches WHERE batch_id = %s;",
                    (batch_id,)
                )
                batch = cursor.fetchone()

                if not batch:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Food batch with ID {batch_id} not found"
                    )

                # 2. Update status to DISCARDED
                cursor.execute("""
                    UPDATE food_batches
                    SET status = 'DISCARDED'
                    WHERE batch_id = %s
                    RETURNING batch_id, item_id, amount, status, cooked_at, expires_at;
                """, (batch_id,))
                updated_batch = cursor.fetchone()

                # 3. Log the discard action
                cursor.execute("""
                    INSERT INTO logs (batch_id, action_type, info)
                    VALUES (%s, 'DISCARD_BATCH', %s);
                """, (
                    batch_id,
                    f"Batch #{batch_id} manually marked as DISCARDED"
                ))

                conn.commit()
                return updated_batch

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to discard batch: {str(e)}"
        )
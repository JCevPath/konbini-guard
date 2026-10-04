from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

app = FastAPI(title="KonbiniGuard Backend API")

class FoodItemCreate(BaseModel):
    name: str
    category: str
    shelf_life_minutes: int = Field(gt=0, description="Shelf life must be greater than 0")

class BatchCreate(BaseModel):
    item_id: int
    quantity: int = Field(gt=0, description="Quantity must be greater than 0")

class StockUpdate(BaseModel):
    quantity: int = Field(ge=0, description="Quantity cannot be negative")

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database connection failed")

@app.get("/food/items")
def get_catalog_items(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT id, name, category, shelf_life_minutes FROM food_items")).mappings().all()
    return list(result)

@app.post("/food/items", status_code=status.HTTP_201_CREATED)
def add_catalog_item(item: FoodItemCreate, db: Session = Depends(get_db)):
    query = text("""
        INSERT INTO food_items (name, category, shelf_life_minutes)
        VALUES (:name, :category, :shelf_life)
        RETURNING id, name, category, shelf_life_minutes;
    """)
    new_item = db.execute(query, {
        "name": item.name, 
        "category": item.category, 
        "shelf_life": item.shelf_life_minutes
    }).mappings().fetchone()
    db.commit()
    return new_item

@app.get("/food/batches")
def get_inventory_batches(db: Session = Depends(get_db)):
    query = text("""
        SELECT 
            b.id AS batch_id,
            b.item_id,
            f.name AS item_name,
            b.quantity,
            b.status,
            b.cooked_at,
            b.expires_at
        FROM batch_logs b
        JOIN food_items f ON b.item_id = f.id
        ORDER BY b.id DESC;
    """)
    result = db.execute(query).mappings().all()
    return list(result)

@app.post("/food/batches", status_code=status.HTTP_201_CREATED)
def register_cooked_batch(batch: BatchCreate, db: Session = Depends(get_db)):
    item = db.execute(
        text("SELECT shelf_life_minutes, name FROM food_items WHERE id = :id"),
        {"id": batch.item_id}
    ).mappings().fetchone()
    
    if not item:
        raise HTTPException(status_code=404, detail=f"Food item #{batch.item_id} not found")

    cooked_at = datetime.utcnow()
    expires_at = cooked_at + timedelta(minutes=item["shelf_life_minutes"])

    batch_query = text("""
        INSERT INTO batch_logs (item_id, quantity, status, cooked_at, expires_at)
        VALUES (:item_id, :quantity, 'FRESH', :cooked_at, :expires_at)
        RETURNING id AS batch_id, item_id, quantity, status, cooked_at, expires_at;
    """)
    new_batch = dict(db.execute(batch_query, {
        "item_id": batch.item_id,
        "quantity": batch.quantity,
        "cooked_at": cooked_at,
        "expires_at": expires_at
    }).mappings().fetchone())

    log_query = text("""
        INSERT INTO logs (batch_id, action_type, info)
        VALUES (:batch_id, 'COOK_BATCH', :info);
    """)
    db.execute(log_query, {
        "batch_id": new_batch["batch_id"],
        "info": f"Cooked {batch.quantity} units of {item['name']}"
    })

    db.commit()
    new_batch["item_name"] = item["name"]
    return new_batch

@app.put("/food/batches/{batch_id}/stock")
def update_batch_stock(batch_id: int, stock: StockUpdate, db: Session = Depends(get_db)):
    query = text("""
        UPDATE batch_logs 
        SET quantity = :qty 
        WHERE id = :id 
        RETURNING id AS batch_id, item_id, quantity, status;
    """)
    updated = db.execute(query, {"qty": stock.quantity, "id": batch_id}).mappings().fetchone()
    
    if not updated:
        raise HTTPException(status_code=404, detail=f"Batch #{batch_id} not found")
        
    db.commit()
    return updated

@app.patch("/food/batches/{batch_id}/discard")
def discard_batch(batch_id: int, db: Session = Depends(get_db)):
    query = text("""
        UPDATE batch_logs
        SET status = 'DISCARDED'
        WHERE id = :id
        RETURNING id AS batch_id, item_id, quantity, status;
    """)
    updated_batch = db.execute(query, {"id": batch_id}).mappings().fetchone()

    if not updated_batch:
        raise HTTPException(status_code=404, detail=f"Batch #{batch_id} not found")

    db.execute(text("""
        INSERT INTO logs (batch_id, action_type, info)
        VALUES (:batch_id, 'DISCARD_BATCH', :info);
    """), {
        "batch_id": batch_id,
        "info": f"Batch #{batch_id} manually marked as DISCARDED"
    })

    db.commit()
    return updated_batch

@app.get("/api/notifications/alerts")
def get_alerts(db: Session = Depends(get_db)):
    return []
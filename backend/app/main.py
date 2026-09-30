from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.database import get_db

app = FastAPI()

class FoodItemCreate(BaseModel):
    name: str
    category: str
    shelf_life_minutes: int

class BatchCreate(BaseModel):
    item_id: int
    quantity: int

class StockUpdate(BaseModel):
    batch_id: int
    quantity: int

@app.get("/food/items")
def get_catalog_items(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT id, name, category, shelf_life_minutes FROM food_items")).fetchall()
    items = []
    for row in result:
        items.append({
            "id": row[0],
            "name": row[1],
            "category": row[2],
            "shelf_life_minutes": row[3]
        })
    return items

@app.post("/food/items")
def add_catalog_item(item: FoodItemCreate, db: Session = Depends(get_db)):
    query = text("INSERT INTO food_items (name, category, shelf_life_minutes) VALUES (:name, :category, :shelf_life)")
    db.execute(query, {"name": item.name, "category": item.category, "shelf_life": item.shelf_life_minutes})
    db.commit()
    return {"message": "Item added successfully"}

@app.post("/food/batches")
def register_cooked_batch(batch: BatchCreate, db: Session = Depends(get_db)):
    item = db.execute(
        text("SELECT shelf_life_minutes FROM food_items WHERE id = :id"),
        {"id": batch.item_id}
    ).fetchone()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    cooked_at = datetime.utcnow()
    expires_at = cooked_at + timedelta(minutes=item[0])

    query = text("""
        INSERT INTO batch_logs (item_id, quantity, cooked_at, expires_at, status)
        VALUES (:item_id, :quantity, :cooked_at, :expires_at, 'FRESH')
    """)
    db.execute(query, {
        "item_id": batch.item_id,
        "quantity": batch.quantity,
        "cooked_at": cooked_at,
        "expires_at": expires_at
    })
    db.commit()

    return {"message": "Batch added successfully"}

@app.put("/food/stocks")
def update_batch_stock(stock: StockUpdate, db: Session = Depends(get_db)):
    query = text("UPDATE batch_logs SET quantity = :qty WHERE id = :id")
    db.execute(query, {"qty": stock.quantity, "id": stock.batch_id})
    db.commit()
    return {"message": "Stock updated successfully"}
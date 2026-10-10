CREATE TABLE IF NOT EXISTS food_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    shelf_life_minutes INT NOT NULL,
    price INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_logs (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity >= 0),
    status VARCHAR(20) DEFAULT 'FRESH',
    cooked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
    log_id SERIAL PRIMARY KEY,
    batch_id INT,
    action_type VARCHAR(50) NOT NULL,
    info TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO food_items (name, category, price, shelf_life_minutes) VALUES
('Karaage (Fried Chicken)', 'Hot Snacks', 75, 2),
('Pork Steamed Bun', 'Hot Snacks', 45, 2),
('Hot Dog Stick', 'Hot Snacks', 35, 1),
('Egg Salad Sandwich', 'Sandwiches', 60, 3);
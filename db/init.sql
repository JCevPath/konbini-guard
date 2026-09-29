CREATE TABLE IF NOT EXISTS menu (
    item_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    max_minutes INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_batches (
    batch_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES menu(item_id) ON DELETE CASCADE,
    amount INT NOT NULL CHECK (amount > 0),
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

INSERT INTO menu (item_name, price, max_minutes) VALUES
('Karaage (Fried Chicken)', 75, 240),
('Pork Steamed Bun', 45, 180),
('Hot Dog Stick', 35, 120),
('Egg Salad Sandwich', 60, 360);
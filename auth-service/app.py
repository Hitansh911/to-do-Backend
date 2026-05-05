import os
import time
import bcrypt
import jwt
import datetime
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics
from psycopg2 import pool

app = Flask(__name__)
CORS(app)
PrometheusMetrics(app)

POSTGRES_USER = os.environ.get("POSTGRES_USER", "notesuser")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "changeme")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "notesdb")
POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "localhost")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-secret")
JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS", "24"))

db_pool = None
db_initialized = False

def init_db():
    global db_pool, db_initialized
    if db_initialized:
        return
        
    retries = 5
    for i in range(retries):
        try:
            db_pool = pool.SimpleConnectionPool(
                1, 10,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
                database=POSTGRES_DB,
                host=POSTGRES_HOST
            )
            
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(80) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL
                );
            """)
            conn.commit()
            db_pool.putconn(conn)
            db_initialized = True
            print("Database initialized successfully!", flush=True)
            break
        except Exception as e:
            print(f"Database not ready, retrying in 2 seconds... ({i+1}/{retries}) Error: {e}", flush=True)
            if db_pool:
                db_pool.closeall()
                db_pool = None
            time.sleep(2)

# Run init_db() BEFORE every request (only actually runs once per worker)
@app.before_request
def ensure_db():
    init_db()

@app.route('/api/auth/health')
def health():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/auth/register', methods=['POST'])
def register():
    if not db_pool:
        return jsonify({"status": "error", "message": "Database not available"}), 503

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Username and password required"}), 400
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO users (username, password_hash) VALUES (%s, %s) RETURNING id",
                (username, hashed.decode('utf-8'))
            )
            user_id = cur.fetchone()[0]
            conn.commit()
            return jsonify({"status": "success", "data": {"id": user_id, "username": username}}), 201
        except Exception as e:
            conn.rollback()
            return jsonify({"status": "error", "message": "Username already exists"}), 409
    finally:
        db_pool.putconn(conn)

@app.route('/api/auth/login', methods=['POST'])
def login():
    if not db_pool:
        return jsonify({"status": "error", "message": "Database not available"}), 503

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"status": "error", "message": "Username and password required"}), 400

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, password_hash FROM users WHERE username = %s", (username,))
        row = cur.fetchone()
        if not row or not bcrypt.checkpw(password.encode('utf-8'), row[1].encode('utf-8')):
            return jsonify({"status": "error", "message": "Invalid credentials"}), 401
        
        token = jwt.encode({
            'user_id': row[0],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS)
        }, JWT_SECRET, algorithm="HS256")
        
        return jsonify({"status": "success", "data": {"token": token}}), 200
    finally:
        db_pool.putconn(conn)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)
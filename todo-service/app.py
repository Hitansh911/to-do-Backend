import os
import json
import time
import jwt
import redis
from flask import Flask, request, jsonify
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
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-secret")

db_pool = pool.SimpleConnectionPool(
    1, 10,
    user=POSTGRES_USER,
    password=POSTGRES_PASSWORD,
    database=POSTGRES_DB,
    host=POSTGRES_HOST,
    connect_timeout=5
)
redis_client = redis.from_url(REDIS_URL)

def init_db():
    retries = 5
    for i in range(retries):
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS todos (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    due_date DATE,
                    priority VARCHAR(50) DEFAULT 'low',
                    completed BOOLEAN DEFAULT FALSE,
                    notes TEXT DEFAULT ''
                );
            """)
            # Migrate: add notes column if missing
            cur.execute("""
                ALTER TABLE todos ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
            """)
            conn.commit()
            db_pool.putconn(conn)
            print("Database initialized & migrated successfully!")
            return
        except Exception as e:
            print(f"DB not ready, retrying... ({i+1}/{retries}) Error: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to database after retries")

init_db()

def get_user_id(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@app.route('/api/todos/health', strict_slashes=False)
def health():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/todos', methods=['GET'], strict_slashes=False)
def get_todos():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    cache_key = f"todos:{user_id}"
    cached = redis_client.get(cache_key)
    if cached:
        return jsonify({"status": "success", "data": json.loads(cached)}), 200

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, due_date, priority, completed, notes FROM todos WHERE user_id = %s ORDER BY id DESC",
            (user_id,)
        )
        rows = cur.fetchall()
        data = [
            {"id": r[0], "title": r[1], "due_date": str(r[2]) if r[2] else None,
             "priority": r[3], "completed": r[4], "notes": r[5] or ""}
            for r in rows
        ]
        redis_client.setex(cache_key, 60, json.dumps(data))
        return jsonify({"status": "success", "data": data}), 200
    finally:
        db_pool.putconn(conn)

@app.route('/api/todos', methods=['POST'], strict_slashes=False)
def create_todo():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data = request.get_json()
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO todos (user_id, title, due_date, priority, notes) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (user_id, data.get('title'), data.get('due_date'), data.get('priority', 'low'), data.get('notes', ''))
        )
        todo_id = cur.fetchone()[0]
        conn.commit()
        redis_client.delete(f"todos:{user_id}")
        return jsonify({"status": "success", "data": {
            "id": todo_id,
            "title": data.get('title'),
            "due_date": data.get('due_date'),
            "priority": data.get('priority', 'low'),
            "completed": False,
            "notes": data.get('notes', '')
        }}), 201
    finally:
        db_pool.putconn(conn)

@app.route('/api/todos/<int:todo_id>', methods=['PATCH'], strict_slashes=False)
def update_todo(todo_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data = request.get_json()
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        if "completed" in data:
            cur.execute("UPDATE todos SET completed=%s WHERE id=%s AND user_id=%s", (data['completed'], todo_id, user_id))
        if "title" in data:
            cur.execute("UPDATE todos SET title=%s WHERE id=%s AND user_id=%s", (data['title'], todo_id, user_id))
        if "notes" in data:
            cur.execute("UPDATE todos SET notes=%s WHERE id=%s AND user_id=%s", (data['notes'], todo_id, user_id))
        conn.commit()
        redis_client.delete(f"todos:{user_id}")
        return jsonify({"status": "success", "data": {"message": "Updated"}}), 200
    finally:
        db_pool.putconn(conn)

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'], strict_slashes=False)
def delete_todo(todo_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM todos WHERE id = %s AND user_id = %s", (todo_id, user_id))
        conn.commit()
        redis_client.delete(f"todos:{user_id}")
        return jsonify({"status": "success", "data": {"message": "Deleted"}}), 200
    finally:
        db_pool.putconn(conn)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
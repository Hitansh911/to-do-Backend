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

# ✅ connect_timeout prevents hanging forever
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
                CREATE TABLE IF NOT EXISTS notes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT,
                    tags VARCHAR(255)
                );
            """)
            conn.commit()
            db_pool.putconn(conn)
            print("Database initialized successfully!")
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

@app.route('/api/notes/health')
def health():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/notes', methods=['GET'])
def get_notes():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    cache_key = f"notes:{user_id}"
    cached = redis_client.get(cache_key)
    if cached:
        return jsonify({"status": "success", "data": json.loads(cached)}), 200

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, title, content, tags FROM notes WHERE user_id = %s", (user_id,))
        rows = cur.fetchall()
        data = [{"id": r[0], "title": r[1], "content": r[2], "tags": r[3]} for r in rows]
        redis_client.setex(cache_key, 60, json.dumps(data))
        return jsonify({"status": "success", "data": data}), 200
    finally:
        db_pool.putconn(conn)

@app.route('/api/notes', methods=['POST'])
def create_note():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data = request.get_json()
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO notes (user_id, title, content, tags) VALUES (%s, %s, %s, %s) RETURNING id",
                    (user_id, data.get('title'), data.get('content'), data.get('tags')))
        note_id = cur.fetchone()[0]
        conn.commit()
        redis_client.delete(f"notes:{user_id}")
        return jsonify({"status": "success", "data": {"id": note_id}}), 201
    finally:
        db_pool.putconn(conn)

@app.route('/api/notes/<int:note_id>', methods=['GET'])
def get_note(note_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, title, content, tags FROM notes WHERE id = %s AND user_id = %s", (note_id, user_id))
        row = cur.fetchone()
        if not row: return jsonify({"status": "error", "message": "Not found"}), 404
        return jsonify({"status": "success", "data": {"id": row[0], "title": row[1], "content": row[2], "tags": row[3]}}), 200
    finally:
        db_pool.putconn(conn)

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data = request.get_json()
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE notes SET title=%s, content=%s, tags=%s WHERE id=%s AND user_id=%s",
                    (data.get('title'), data.get('content'), data.get('tags'), note_id, user_id))
        conn.commit()
        redis_client.delete(f"notes:{user_id}")
        return jsonify({"status": "success", "data": {"message": "Updated"}}), 200
    finally:
        db_pool.putconn(conn)

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM notes WHERE id = %s AND user_id = %s", (note_id, user_id))
        conn.commit()
        redis_client.delete(f"notes:{user_id}")
        return jsonify({"status": "success", "data": {"message": "Deleted"}}), 200
    finally:
        db_pool.putconn(conn)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
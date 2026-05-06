import os
import json
import time
import jwt
import redis
from flask import Flask, request, jsonify
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics
from psycopg2 import pool
from datetime import datetime

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
                CREATE TABLE IF NOT EXISTS notes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT,
                    tags VARCHAR(255)
                );
            """)
            # Migrations to add new fields
            cur.execute("ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            cur.execute("ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            cur.execute("ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE")
            cur.execute("ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder VARCHAR(255)")
            cur.execute("ALTER TABLE notes ADD COLUMN IF NOT EXISTS emoji VARCHAR(10)")
            cur.execute("ALTER TABLE notes ADD COLUMN IF NOT EXISTS preview_image_url TEXT")
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

def default_converter(o):
    if isinstance(o, datetime):
        return o.isoformat()

@app.route('/api/notes/health', strict_slashes=False)
def health():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/notes', methods=['GET'], strict_slashes=False)
def get_notes():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    sort_by = request.args.get('sort_by', 'updated_at')
    folder = request.args.get('folder', None)
    is_starred = request.args.get('is_starred', None)

    cache_key = f"notes:{user_id}:sort:{sort_by}:folder:{folder}:star:{is_starred}"
    cached = redis_client.get(cache_key)
    if cached:
        return jsonify({"status": "success", "data": json.loads(cached)}), 200

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        
        query = "SELECT id, title, content, created_at, updated_at, is_starred, folder, emoji, preview_image_url FROM notes WHERE user_id = %s"
        params = [user_id]

        if folder:
            query += " AND folder = %s"
            params.append(folder)
            
        if is_starred == 'true':
            query += " AND is_starred = TRUE"

        if sort_by == 'name':
            query += " ORDER BY title ASC"
        elif sort_by == 'created_at':
            query += " ORDER BY created_at DESC"
        else: # default updated_at
            query += " ORDER BY updated_at DESC"

        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        data = []
        for r in rows:
            data.append({
                "id": r[0], "title": r[1], "content": r[2],
                "created_at": r[3], "updated_at": r[4],
                "is_starred": r[5], "folder": r[6],
                "emoji": r[7], "preview_image_url": r[8]
            })
            
        redis_client.setex(cache_key, 60, json.dumps(data, default=default_converter))
        return jsonify({"status": "success", "data": data}), 200
    finally:
        db_pool.putconn(conn)

@app.route('/api/notes', methods=['POST'], strict_slashes=False)
def create_note():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data = request.get_json()
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO notes (user_id, title, content, folder, emoji, preview_image_url, is_starred, created_at, updated_at) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id, created_at, updated_at
        """, (
            user_id, data.get('title'), data.get('content'),
            data.get('folder'), data.get('emoji'), data.get('preview_image_url'),
            data.get('is_starred', False)
        ))
        row = cur.fetchone()
        note_id, created_at, updated_at = row[0], row[1], row[2]
        conn.commit()
        
        # clear cache wildcards
        for key in redis_client.scan_iter(f"notes:{user_id}:*"):
            redis_client.delete(key)
            
        return jsonify({"status": "success", "data": {
            "id": note_id,
            "title": data.get('title'),
            "content": data.get('content'),
            "folder": data.get('folder'),
            "emoji": data.get('emoji'),
            "preview_image_url": data.get('preview_image_url'),
            "is_starred": data.get('is_starred', False),
            "created_at": created_at,
            "updated_at": updated_at
        }}), 201
    finally:
        db_pool.putconn(conn)

@app.route('/api/notes/<int:note_id>', methods=['GET'], strict_slashes=False)
def get_note(note_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, title, content, created_at, updated_at, is_starred, folder, emoji, preview_image_url FROM notes WHERE id = %s AND user_id = %s", (note_id, user_id))
        row = cur.fetchone()
        if not row: return jsonify({"status": "error", "message": "Not found"}), 404
        
        data = {
            "id": row[0], "title": row[1], "content": row[2],
            "created_at": row[3], "updated_at": row[4],
            "is_starred": row[5], "folder": row[6],
            "emoji": row[7], "preview_image_url": row[8]
        }
        return jsonify({"status": "success", "data": data}), 200
    finally:
        db_pool.putconn(conn)

@app.route('/api/notes/<int:note_id>', methods=['PUT'], strict_slashes=False)
def update_note(note_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data = request.get_json()
    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE notes SET 
                title=%s, content=%s, folder=%s, emoji=%s, 
                preview_image_url=%s, is_starred=%s, updated_at=CURRENT_TIMESTAMP 
            WHERE id=%s AND user_id=%s
        """, (
            data.get('title'), data.get('content'), data.get('folder'), 
            data.get('emoji'), data.get('preview_image_url'), data.get('is_starred'),
            note_id, user_id
        ))
        conn.commit()
        
        for key in redis_client.scan_iter(f"notes:{user_id}:*"):
            redis_client.delete(key)
            
        return jsonify({"status": "success", "data": {"message": "Updated"}}), 200
    finally:
        db_pool.putconn(conn)

@app.route('/api/notes/<int:note_id>', methods=['DELETE'], strict_slashes=False)
def delete_note(note_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_id(token)
    if not user_id: return jsonify({"status": "error", "message": "Unauthorized"}), 401

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM notes WHERE id = %s AND user_id = %s", (note_id, user_id))
        conn.commit()
        
        for key in redis_client.scan_iter(f"notes:{user_id}:*"):
            redis_client.delete(key)
            
        return jsonify({"status": "success", "data": {"message": "Deleted"}}), 200
    finally:
        db_pool.putconn(conn)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
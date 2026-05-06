export interface Note {
  id: number;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_starred: boolean;
  folder: string | null;
  emoji: string | null;
  preview_image_url: string | null;
}

export interface Todo {
  id: number;
  title: string;
  due_date: string | null;
  priority: string;
  completed: boolean;
  notes: string;
}

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});
  
  // Set Content-Type by default if body exists and is JSON
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Attach token if exists
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    cache: "no-store",
    ...options,
    headers,
  });

  return response;
};

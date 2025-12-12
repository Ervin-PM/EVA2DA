import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://todo-list.dobleb.cl';

export function getApiBaseUrl(): string {
  return (API_URL || '').replace(/\/$/, '');
}

export function normalizeImageUrl(url?: string): string | undefined {
  if (!url) return url;
  const base = getApiBaseUrl();
  if (url.startsWith('/')) return `${base}${url}`;
  if (!(url.startsWith('http://') || url.startsWith('https://')))
    return `${base}/${url}`;
  
  if (url.includes('.r2.dev')) {
    return url;
  }
  
  try {
    const api = new URL(base);
    const target = new URL(url);
    if (base.startsWith('http://') && target.hostname !== api.hostname) {
      return `${base}${target.pathname}${target.search}${target.hash}`;
    }
  } catch {}
  return url;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  userId: string;
  image?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiError {
  message: string;
  status: number;
}

class ApiClient {
  private token: string | null = null;

  async initialize() {
    try {
      this.token = await AsyncStorage.getItem('@eva2:token');
    } catch (error) {
    }
  }

  async setToken(newToken: string) {
    this.token = newToken;
    await AsyncStorage.setItem('@eva2:token', newToken);
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('@eva2:token');
  }

  getToken(): string | null {
    return this.token;
  }

  private async getHeaders(includeAuth = true, contentType = 'application/json') {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private handleResponse(data: any): any {
    const result = data.data || data;
    return result;
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    let lastError: any = null;
    
    // Reintentar hasta 5 veces con timeout de 5s
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const response = await axios.post(
          `${API_URL}/auth/register`,
          { email, password },
          {
            headers: await this.getHeaders(false),
            timeout: 5000,
          }
        );
        
        const data = this.handleResponse(response.data);
        
        if (data.token) {
          await this.setToken(data.token);
        }
        return data;
      } catch (error) {
        lastError = error;
        
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    throw lastError;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    let lastError: any = null;
    
    // Reintentar hasta 5 veces con timeout de 5s
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const response = await axios.post(
          `${API_URL}/auth/login`,
          { email, password },
          {
            headers: await this.getHeaders(false),
            timeout: 5000,
          }
        );
        
        const data = this.handleResponse(response.data);
        
        if (data.token) {
          await this.setToken(data.token);
        }
        return data;
      } catch (error) {
        lastError = error;
        
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    throw lastError;
  }

  async getTodos(): Promise<Todo[]> {
    const maxAttempts = 5;
    const baseDelayMs = 500;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(
          `${API_URL}/todos`,
          {
            headers: await this.getHeaders(true),
            timeout: 7000,
          }
        );
        return this.handleResponse(response.data);
      } catch (error) {
        lastError = error;
        const msg = (error as any)?.message || String(error);
        // If not a network error, don't retry
        if (msg && !msg.toLowerCase().includes('network')) {
          break;
        }
        if (attempt < maxAttempts) {
          const wait = baseDelayMs * attempt;
          await new Promise(r => setTimeout(r, wait));
        }
      }
    }
    throw lastError;
  }

  async getTodo(id: string): Promise<Todo> {
    try {
      const response = await axios.get(
        `${API_URL}/todos/${id}`,
        {
          headers: await this.getHeaders(true),
          timeout: 10000,
        }
      );
      return this.handleResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async createTodo(data: {
    title: string;
    image?: string;
    location?: { latitude: number; longitude: number };
  }): Promise<Todo> {
    try {
      const response = await axios.post(
        `${API_URL}/todos`,
        data,
        {
          headers: await this.getHeaders(true),
          timeout: 10000,
        }
      );
      return this.handleResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async updateTodo(
    id: string,
    data: Partial<{
      title: string;
      completed: boolean;
      image?: string;
      location?: { latitude: number; longitude: number };
    }>
  ): Promise<Todo> {
    try {
      const response = await axios.patch(
        `${API_URL}/todos/${id}`,
        data,
        {
          headers: await this.getHeaders(true),
          timeout: 10000,
        }
      );
      return this.handleResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async toggleTodo(id: string, completed: boolean): Promise<Todo> {
    return this.updateTodo(id, { completed });
  }

  async deleteTodo(id: string): Promise<void> {
    try {
      const response = await axios.delete(
        `${API_URL}/todos/${id}`,
        {
          headers: await this.getHeaders(true),
          timeout: 10000,
        }
      );
      await this.handleResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async uploadImage(opts: { uri: string; name?: string; type?: string }): Promise<{ url?: string; imageUrl?: string; key?: string; size?: number; contentType?: string }> {
    const { uri, name = 'photo.jpg', type = 'image/jpeg' } = opts;
    // Leer userId para servidores que lo requieren en el multipart
    let userId: string | null = null;
    try { userId = await AsyncStorage.getItem('@eva2:currentUserId'); } catch {}

    const buildForm = (fieldName: 'file' | 'image') => {
      const fd = new FormData();
      fd.append(fieldName, { uri, name, type } as any);
      if (userId) fd.append('userId', userId);
      return fd;
    };

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const attemptPost = async (fd: FormData, label: string) => {
      try {
        const response = await axios.post(`${API_URL}/images`, fd, {
          headers,
          timeout: 30000,
          maxContentLength: Infinity as any,
          maxBodyLength: Infinity as any,
        });
        return this.handleResponse(response.data);
      } catch (axiosErr) {
        throw axiosErr;
      }
    };

    // El servidor requiere el campo "image" (no "file")
    try {
      return await attemptPost(buildForm('image'), 'image');
    } catch (axiosErr) {
      // Fallback con fetch + AbortController
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const fetchHeaders: Record<string, string> = { Accept: 'application/json' };
      if (this.token) fetchHeaders['Authorization'] = `Bearer ${this.token}`;

      const fd = buildForm('image');
      const res = await fetch(`${API_URL}/images`, {
        method: 'POST',
        headers: fetchHeaders,
        body: fd as any,
        signal: controller.signal,
      } as any);
      clearTimeout(timeout);
      const json = await res.json();
      return this.handleResponse(json);
    }
  }

  async deleteImage(userId: string, imageId: string): Promise<void> {
    try {
      const response = await axios.delete(
        `${API_URL}/images/${userId}/${imageId}`,
        {
          headers: await this.getHeaders(true),
          timeout: 10000,
        }
      );
      await this.handleResponse(response.data);
    } catch (error) {
      throw error;
    }
  }
}

export const apiClient = new ApiClient();

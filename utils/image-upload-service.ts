import { API_URL } from '@/constants/config';
import axios from 'axios';

export interface ImageUploadResponse {
  imageUrl?: string;
  url?: string;
  key?: string;
  size?: number;
  contentType?: string;
  message?: string;
  error?: string;
  image?: string;
  path?: string;
  location?: string;
  data?: any;
}

type UploadImageParams = {
  uri: string;
  name: string;
  type: string;
  userId?: string;
};

type UploadImageFn = (params: UploadImageParams) => Promise<string>;

function pickUrl(data: any): string | undefined {
  const candidates: Array<unknown> = [
    data?.imageUrl,
    data?.url,
    data?.image,
    data?.location,
    data?.path,
    data?.data?.imageUrl,
    data?.data?.url,
  ];

  for (const val of candidates) {
    if (typeof val === 'string' && val.trim()) return val.trim();
  }

  if (Array.isArray(data) && data.length && typeof data[0] === 'string') {
    return data[0];
  }

  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  return undefined;
}

export default function getImageUploadService({ token }: { token: string }): { uploadImage: UploadImageFn } {
  const client = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      // No fijar Content-Type: RN/axios agrega boundary automáticamente
    },
  });

  async function uploadImage({ uri, name, type, userId }: UploadImageParams): Promise<string> {
    const buildForm = (fieldName: 'image' | 'file') => {
      const fd = new FormData();
      fd.append(fieldName, { uri, name, type } as any);
      if (userId) fd.append('userId', userId);
      return fd;
    };

    const attemptAxios = async (fd: FormData) => {
      try {
        const response = await client.post<ImageUploadResponse>('/images', fd, {
          timeout: 30000,
          maxContentLength: Infinity as any,
          maxBodyLength: Infinity as any,
        });
        const url = pickUrl(response.data);
        if (!url) throw new Error(`No se recibió imageUrl/url en la respuesta de /images: ${JSON.stringify(response.data)}`);
        return url;
      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
        const error = new Error(`Upload falló (${status || 'sin código'}): ${msg || 'error desconocido'}`);
        (error as any).status = status;
        throw error;
      }
    };

    try {
      return await attemptAxios(buildForm('image'));
    } catch (axiosErr) {
      // Reintentar usando otro nombre de campo y fetch como respaldo
      try {
        return await attemptAxios(buildForm('file'));
      } catch (axiosErr2) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          const res = await fetch(`${API_URL}/images`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            body: buildForm('image') as any,
            signal: controller.signal,
          } as any);
          clearTimeout(timeout);

          if (!res.ok) {
            const text = await res.text();
            const error = new Error(`Upload falló (fetch ${res.status}): ${text}`);
            (error as any).status = res.status;
            throw error;
          }

          let json: any = null;
          const text = await res.text();
          try { json = text ? JSON.parse(text) : {}; } catch { json = text; }

          const url = pickUrl(json);
          if (!url) throw new Error(`No se recibió imageUrl/url en la respuesta de /images: ${text}`);
          return url;
        } catch (fetchErr) {
          throw fetchErr;
        }
      }
    }
  }

  return { uploadImage };
}

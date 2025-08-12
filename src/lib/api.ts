// lib/api.ts
import axios from 'axios';

export interface Prompt {
  id_prompt: number;
  chave: string;
  texto: string;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Só registra o interceptor no browser
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

// ---- Endpoints
export const getPrompts = async () => {
  const { data } = await api.get('/prompts_read_list');
  return data as Prompt[];
};

export const getPromptById = async (id: number) => {
  const { data } = await api.get(`/prompt_read_key/${id}`);
  return data as Prompt;
};

export const createPrompt = async (payload: Omit<Prompt, 'id_prompt'>) => {
  const { data } = await api.post('/prompts_create', payload);
  return data as Prompt;
};

export const updatePrompt = async (id: number, payload: Partial<Omit<Prompt, 'id_prompt'>>) => {
  const { data } = await api.patch(`/prompts_update/${id}`, payload);
  return data as Prompt;
};

export const deletePrompt = async (id: number) => {
  await api.delete(`/prompts_delete/${id}`);
};

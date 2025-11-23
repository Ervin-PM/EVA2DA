import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export type Task = {
  id: string;
  title: string;
  photoUri?: string;
  location?: { latitude: number; longitude: number } | null;
  completed: boolean;
  createdAt: string;
  userId: string;
};

const TASKS_KEY_PREFIX = '@eva2:tasks:';
const USER_KEY = '@eva2:currentUser';
const USERS_KEY = '@eva2:users';

export async function getCurrentUser(): Promise<string | null> {
  try {
    const u = await AsyncStorage.getItem(USER_KEY);
    return u;
  } catch (e) {
    console.warn('getCurrentUser error', e);
    return null;
  }
}

export async function setCurrentUser(userId: string) {
  try {
    await AsyncStorage.setItem(USER_KEY, userId);
  } catch (e) {
    console.warn('setCurrentUser error', e);
  }
}

export async function logout() {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.warn('logout error', e);
  }
}

export async function getUsers(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch (e) {
    console.warn('getUsers error', e);
    return {};
  }
}

export async function saveUsers(users: Record<string, string>) {
  try {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('saveUsers error', e);
  }
}

/**
 * Authenticate existing user or create a new one.
 * Returns 'ok' if authenticated, 'created' if a new user was created, or 'invalid' if password mismatch.
 */
export async function authenticateOrRegister(username: string, password: string): Promise<'ok' | 'created' | 'invalid'> {
  try {
    const users = await getUsers();
    const existing = users[username];
    if (existing) {
      if (existing === password) {
        await setCurrentUser(username);
        return 'ok';
      }
      return 'invalid';
    }
    // create new user
    users[username] = password;
    await saveUsers(users);
    await setCurrentUser(username);
    return 'created';
  } catch (e) {
    console.warn('authenticateOrRegister error', e);
    return 'invalid';
  }
}

export async function authenticateUser(username: string, password: string): Promise<'ok' | 'invalid' | 'not-found'> {
  try {
    const users = await getUsers();
    const existing = users[username];
    if (!existing) return 'not-found';
    if (existing === password) {
      await setCurrentUser(username);
      return 'ok';
    }
    return 'invalid';
  } catch (e) {
    console.warn('authenticateUser error', e);
    return 'invalid';
  }
}

export async function registerUser(username: string, password: string): Promise<'created' | 'exists' | 'error'> {
  try {
    const users = await getUsers();
    const existing = users[username];
    if (existing) return 'exists';
    users[username] = password;
    await saveUsers(users);
    await setCurrentUser(username);
    return 'created';
  } catch (e) {
    console.warn('registerUser error', e);
    return 'error';
  }
}

function tasksKeyForUser(userId: string) {
  return `${TASKS_KEY_PREFIX}${userId}`;
}

export async function loadTasksForUser(userId: string): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(tasksKeyForUser(userId));
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  } catch (e) {
    console.warn('loadTasksForUser error', e);
    return [];
  }
}

export async function saveTasksForUser(userId: string, tasks: Task[]) {
  try {
    await AsyncStorage.setItem(tasksKeyForUser(userId), JSON.stringify(tasks));
  } catch (e) {
    console.warn('saveTasksForUser error', e);
  }
}

export async function addTask(userId: string, t: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const tasks = await loadTasksForUser(userId);
  const newTask: Task = {
    ...t,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  } as Task;
  tasks.unshift(newTask);
  await saveTasksForUser(userId, tasks);
  return newTask;
}

export async function removeTask(userId: string, taskId: string) {
  const tasks = await loadTasksForUser(userId);
  const filtered = tasks.filter((t) => t.id !== taskId);
  await saveTasksForUser(userId, filtered);
}

export async function toggleComplete(userId: string, taskId: string) {
  const tasks = await loadTasksForUser(userId);
  const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
  await saveTasksForUser(userId, updated);
}

export async function savePhotoToAppFolder(uri: string): Promise<string> {
  try {
    const fileName = uri.split('/').pop();
    const dest = `${FileSystem.documentDirectory}photos/${Date.now()}-${fileName}`;
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}photos`, { intermediates: true });
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (e) {
    console.warn('savePhotoToAppFolder error', e);
    return uri;
  }
}

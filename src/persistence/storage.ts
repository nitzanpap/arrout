import AsyncStorage from '@react-native-async-storage/async-storage'

export type StorageKey = 'arrout-progress' | 'arrout-settings'

export async function loadData<T>(key: StorageKey, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (raw === null) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export async function saveData<T>(key: StorageKey, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error(`Failed to save ${key}:`, error)
  }
}

export async function clearData(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to clear ${key}:`, error)
  }
}

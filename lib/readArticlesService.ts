// ============================================
// SERVICE - ARTICLES LUS
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@yoroi_read_articles';

/**
 * Récupère la liste des IDs d'articles lus
 */
export const getReadArticles = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Marque un article comme lu
 */
export const markArticleAsRead = async (articleId: string): Promise<void> => {
  try {
    const readArticles = await getReadArticles();
    if (!readArticles.includes(articleId)) {
      readArticles.push(articleId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(readArticles));
    }
  } catch {
    // Silently fail
  }
};

/**
 * Vérifie si un article est lu
 */
export const isArticleRead = async (articleId: string): Promise<boolean> => {
  const readArticles = await getReadArticles();
  return readArticles.includes(articleId);
};

/**
 * Enlève un article de la liste des lus
 */
export const markArticleAsUnread = async (articleId: string): Promise<void> => {
  try {
    const readArticles = await getReadArticles();
    const filtered = readArticles.filter(id => id !== articleId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
};

export default {
  getReadArticles,
  markArticleAsRead,
  isArticleRead,
  markArticleAsUnread,
};

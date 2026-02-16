// ============================================
// 🔒 SYSTÈME DE LOGGING SÉCURISÉ - YOROI
// ============================================
// Remplace tous les console.log pour éviter les fuites de données en production

import AsyncStorage from '@react-native-async-storage/async-storage';

const ERROR_LOG_KEY = '@yoroi_error_logs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private isDev = __DEV__;
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Limite pour éviter les fuites de mémoire

  private createEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Supprimer le plus ancien
    }
  }

  /**
   * Log de debug - visible uniquement en DEV
   */
  debug(message: string, data?: any) {
    const entry = this.createEntry('debug', message, data);
    this.addLog(entry);

    if (this.isDev) {
      console.log(`🔍 [DEBUG] ${message}`, data ?? '');
    }
  }

  /**
   * Log d'information - visible uniquement en DEV
   */
  info(message: string, data?: any) {
    const entry = this.createEntry('info', message, data);
    this.addLog(entry);

    if (this.isDev) {
      console.log(`ℹ️ [INFO] ${message}`, data ?? '');
    }
  }

  /**
   * Log d'avertissement - visible en DEV et PROD
   */
  warn(message: string, data?: any) {
    const entry = this.createEntry('warn', message, data);
    this.addLog(entry);

    if (this.isDev) {
      console.warn(`[WARN] ${message}`, data ?? '');
    }
  }

  /**
   * Log d'erreur - visible en DEV, envoyé au monitoring en PROD
   */
  error(message: string, error?: any) {
    const entry = this.createEntry('error', message, error);
    this.addLog(entry);

    if (this.isDev) {
      console.error(`❌ [ERROR] ${message}`, error ?? '');
    } else {
      // En production, sauvegarder les erreurs critiques pour diagnostic
      this.saveErrorToStorage(entry);
    }
  }

  private async saveErrorToStorage(entry: LogEntry) {
    try {
      const existingLogsStr = await AsyncStorage.getItem(ERROR_LOG_KEY);
      const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];

      existingLogs.unshift(entry);
      // Garder les 50 dernières erreurs
      const logsToSave = existingLogs.slice(0, 50);

      await AsyncStorage.setItem(ERROR_LOG_KEY, JSON.stringify(logsToSave));
    } catch (e) {
      // Silently fail - on ne veut pas créer une boucle d'erreurs
    }
  }

  /**
   * Récupérer tous les logs (pour debug)
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Exporter les logs au format JSON (pour support utilisateur)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Vider tous les logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Obtenir les statistiques de logs
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    this.logs.forEach(log => {
      stats[log.level]++;
    });

    return stats;
  }
}

// Instance singleton
export const logger = new Logger();

// Export par défaut pour faciliter l'import
export default logger;

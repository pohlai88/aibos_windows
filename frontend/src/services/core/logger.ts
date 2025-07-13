/// <reference lib="deno.ns" />

export interface LogContext {
  component: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

export class EnterpriseLogger implements Logger {
  private isDevelopment = Deno.env.get('NODE_ENV') === 'development';
  private logBuffer: Array<{ level: string; message: string; context: LogContext | undefined; timestamp: string }> = [];
  private maxBufferSize = 1000;

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
    if (!this.isDevelopment) {
      this.sendToMonitoring('error', message, context);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  private log(level: string, message: string, context?: LogContext): void {
    const entry = { level, message, context: context ?? undefined, timestamp: new Date().toISOString() };

    if (this.isDevelopment) {
      const consoleMethod =
        level === 'error'
          ? console.error
          : level === 'warn'
          ? console.warn
          : level === 'debug'
          ? console.debug
          : console.log;
      consoleMethod(`[${level.toUpperCase()}] ${message}`, context || '');
    }

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private sendToMonitoring(level: string, message: string, context?: LogContext) {
    try {
      const errors = JSON.parse(localStorage.getItem('aibos-error-logs') || '[]');
      errors.push({ level, message, context, timestamp: new Date().toISOString() });
      localStorage.setItem('aibos-error-logs', JSON.stringify(errors.slice(-100)));
    } catch (error) {
      console.error('Failed to send to monitoring:', error);
    }
  }

  getLogBuffer() {
    return [...this.logBuffer];
  }

  clearBuffer() {
    this.logBuffer = [];
  }
}
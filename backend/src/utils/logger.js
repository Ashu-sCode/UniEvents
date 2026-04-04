const toErrorPayload = (error) => {
  if (!error) return undefined;

  return {
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
};

const writeLog = (level, message, context = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
};

const logger = {
  info(message, context) {
    writeLog('info', message, context);
  },
  warn(message, context) {
    writeLog('warn', message, context);
  },
  error(message, context = {}) {
    writeLog('error', message, {
      ...context,
      error: toErrorPayload(context.error),
    });
  },
};

module.exports = logger;

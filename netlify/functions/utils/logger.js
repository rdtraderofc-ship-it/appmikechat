const log = (level, message, context = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };
  console.log(JSON.stringify(entry));
};

module.exports = {
  info: (msg, ctx) => log('INFO', msg, ctx),
  warn: (msg, ctx) => log('WARN', msg, ctx),
  error: (msg, ctx) => log('ERROR', msg, ctx)
};

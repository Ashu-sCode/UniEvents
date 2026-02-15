function stripTags(value) {
  if (value === null || value === undefined) return value;
  const str = String(value);
  return str.replace(/<[^>]*>?/gm, '');
}

module.exports = {
  stripTags,
};

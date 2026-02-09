function stripTags(value) {
  if (value === null || value === undefined) return value;
  const str = String(value);
  // Remove anything that looks like an HTML tag.
  return str.replace(/<[^>]*>?/gm, '');
}

module.exports = {
  stripTags,
};

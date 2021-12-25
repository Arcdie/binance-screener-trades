module.exports = () => {
  const result = process.memoryUsage();

  console.log('Memory', {
    ...result,
    rss: `${result.rss} (${result.rss.toString().length})`,
  });
};

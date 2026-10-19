// Retry only provider outages, never authentication, validation, or quota errors.
function createGeminiRequest({ generate, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), random = Math.random }) {
  return async function request(parameters) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await generate({
          ...parameters,
          config: { ...parameters.config, abortSignal: AbortSignal.timeout(10000) }
        });
      } catch (error) {
        const status = Number(error?.status || error?.code || error?.response?.status);
        if (attempt === 2 || ![500, 502, 503, 504].includes(status)) throw error;
        await wait(500 * (2 ** attempt) + Math.floor(random() * 200));
      }
    }
  };
}

module.exports = { createGeminiRequest };

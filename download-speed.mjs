import { performance } from 'node:perf_hooks';

const REQUEST_COUNT = 10;
const TIMEOUT_MS = 60_000;
const BYTES_PER_MEGABYTE = 1_000_000;

async function main() {
  const args = process.argv.slice(2);
  const [address] = args;
  const url = URL.canParse(address) ? new URL(address) : null;

  if (args.length !== 1 || !url || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Укажите один HTTP(S)-адрес: node download-speed.mjs "https://example.com/image.jpg"');
  }

  let totalBytes = 0;
  let totalTimeMs = 0;

  for (let requestNumber = 1; requestNumber <= REQUEST_COUNT; requestNumber += 1) {
    try {
      const startedAt = performance.now();
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
      }

      if (response.body) {
        for await (const chunk of response.body) {
          totalBytes += chunk.byteLength;
        }
      }

      totalTimeMs += performance.now() - startedAt;
    } catch (error) {
      throw new Error(`Запрос ${requestNumber}/${REQUEST_COUNT}: ${error.message}`);
    }
  }

  const averageTimeMs = totalTimeMs / REQUEST_COUNT;
  const speedMBps = totalBytes / BYTES_PER_MEGABYTE / (totalTimeMs / 1_000);

  console.log(`Среднее время запроса: ${averageTimeMs.toFixed(2)} мс`);
  console.log(`Общий объём скачанных данных: ${totalBytes} байт`);
  console.log(`Средняя скорость скачивания: ${speedMBps.toFixed(3)} МБ/с`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

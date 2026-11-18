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
  const requestTimesMs = [];

  for (let requestNumber = 1; requestNumber <= REQUEST_COUNT; requestNumber += 1) {
    try {
      const startedAt = performance.now();
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;

        try {
          await response.body?.cancel();
        } catch (cancelError) {
          message += `. Ошибка отмены чтения: ${cancelError}`;
        }

        throw new Error(message);
      }

      if (response.body) {
        for await (const chunk of response.body) {
          totalBytes += chunk.byteLength;
        }
      }

      const elapsedMs = performance.now() - startedAt;
      requestTimesMs.push(elapsedMs);
    } catch (error) {
      throw new Error(`Запрос ${requestNumber}/${REQUEST_COUNT}: ${error.message}`);
    }
  }

  const totalTimeMs = requestTimesMs.reduce((sum, timeMs) => sum + timeMs, 0);
  const averageTimeMs = totalTimeMs / requestTimesMs.length;
  const minTimeMs = Math.min(...requestTimesMs);
  const maxTimeMs = Math.max(...requestTimesMs);
  const speedMBps = totalBytes / BYTES_PER_MEGABYTE / (totalTimeMs / 1_000);

  return { averageTimeMs, minTimeMs, maxTimeMs, totalBytes, speedMBps };
}

try {
  const { averageTimeMs, minTimeMs, maxTimeMs, totalBytes, speedMBps } = await main();

  console.log(`Среднее время запроса: ${averageTimeMs.toFixed(2)} мс`);
  console.log(`Минимальное время запроса: ${minTimeMs.toFixed(2)} мс`);
  console.log(`Максимальное время запроса: ${maxTimeMs.toFixed(2)} мс`);
  console.log(`Общий объём скачанных данных: ${totalBytes} байт`);
  console.log(`Средняя скорость скачивания: ${speedMBps.toFixed(3)} МБ/с`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

// =============================================================================
// Types
// =============================================================================

interface TelegramChat {
  readonly id: number;
}

interface TelegramUser {
  readonly first_name?: string;
}

interface TelegramMessage {
  readonly message_id: number;
  readonly chat: TelegramChat;
  readonly text?: string;
  readonly from?: TelegramUser;
}

interface TelegramUpdate {
  readonly update_id: number;
  readonly message?: TelegramMessage;
}

interface TelegramApiResponse<T> {
  readonly ok: boolean;
  readonly result?: T;
  readonly description?: string;
}

interface SendMessageResult {
  readonly message_id: number;
}

// =============================================================================
// Configuration
// =============================================================================

interface AppConfig {
  readonly telegramBotToken: string;
  readonly telegramApiBase: string;
  readonly imageApiUrl: string;
  readonly imageApiToken: string;
}

function loadConfig(): AppConfig {
  const telegramBotToken = Bun.env.TELEGRAM_BOT_TOKEN;
  const imageApiToken = Bun.env.IMAGE_API_TOKEN;
  const imageApiUrl =
    Bun.env.IMAGE_API_URL ?? "https://images.amiminn.workers.dev";

  if (!telegramBotToken) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN in environment");
  }

  if (!imageApiToken) {
    throw new Error("Missing IMAGE_API_TOKEN in environment");
  }

  return {
    telegramBotToken,
    telegramApiBase: `https://api.telegram.org/bot${telegramBotToken}`,
    imageApiUrl,
    imageApiToken,
  };
}

const config = loadConfig();

// =============================================================================
// HTTP Utilities
// =============================================================================

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

async function fetchBuffer(
  url: string,
  options?: RequestInit,
): Promise<Uint8Array> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// =============================================================================
// Telegram API
// =============================================================================

function buildTelegramUrl(method: string): string {
  return `${config.telegramApiBase}/${method}`;
}

async function callTelegramApi<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = buildTelegramUrl(method);
  const options: RequestInit | undefined = body
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    : undefined;

  const response = await fetchJson<TelegramApiResponse<T>>(url, options);

  if (!response.ok || response.result === undefined) {
    throw new Error(`Telegram API error: ${response.description ?? "unknown"}`);
  }

  return response.result;
}

async function getUpdates(offset: number): Promise<readonly TelegramUpdate[]> {
  const url = new URL(buildTelegramUrl("getUpdates"));
  url.searchParams.set("timeout", "30");
  url.searchParams.set("offset", offset.toString());

  const response = await fetchJson<TelegramApiResponse<TelegramUpdate[]>>(
    url.toString(),
  );

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.description ?? "unknown"}`);
  }

  return response.result ?? [];
}

async function sendMessage(
  chatId: number,
  text: string,
): Promise<SendMessageResult> {
  return callTelegramApi<SendMessageResult>("sendMessage", {
    chat_id: chatId,
    text,
  });
}

async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
): Promise<void> {
  await callTelegramApi<unknown>("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
  });
}

async function deleteMessage(chatId: number, messageId: number): Promise<void> {
  await callTelegramApi<unknown>("deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

async function sendPhoto(chatId: number, image: Uint8Array): Promise<void> {
  const formData = new FormData();
  formData.append("chat_id", chatId.toString());
  formData.append(
    "photo",
    new Blob([image], { type: "image/jpeg" }),
    "image.jpg",
  );

  const response = await fetch(buildTelegramUrl("sendPhoto"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram sendPhoto failed: ${errorText}`);
  }
}

// =============================================================================
// Image Generation API
// =============================================================================

async function generateImage(prompt: string): Promise<Uint8Array> {
  return fetchBuffer(config.imageApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.imageApiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });
}

// =============================================================================
// Loading Animation
// =============================================================================

const SPINNER_FRAMES = ["✌🏻", "✊🏻", "🖐🏻"] as const;
const LOADING_UPDATE_INTERVAL_MS = 1500;

function getSpinnerFrame(tick: number): string {
  const frame = SPINNER_FRAMES[tick % SPINNER_FRAMES.length];
  return frame ?? SPINNER_FRAMES[0];
}

// =============================================================================
// Time Utilities
// =============================================================================

function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, "0");

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

function getElapsedSeconds(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

// =============================================================================
// Message Handlers
// =============================================================================

function buildLoadingText(startTime: number, tick: number): string {
  const elapsed = formatElapsedTime(getElapsedSeconds(startTime));
  const spinner = getSpinnerFrame(tick);
  return `${spinner} ${elapsed} Sedang memproses permintaan Anda...`;
}

interface LoadingAnimation {
  readonly stop: () => void;
}

function startLoadingAnimation(
  chatId: number,
  messageId: number,
  startTime: number,
): LoadingAnimation {
  let tick = 0;

  const timer = setInterval(() => {
    tick += 1;
    editMessageText(chatId, messageId, buildLoadingText(startTime, tick)).catch(
      (error: unknown) => {
        console.error("Failed to update loading animation:", error);
      },
    );
  }, LOADING_UPDATE_INTERVAL_MS);

  return {
    stop: () => clearInterval(timer),
  };
}

function isCommand(text: string, ...commands: string[]): boolean {
  return commands.includes(text);
}

async function handleHelpCommand(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    "Silakan kirim prompt teks. Bot akan memprosesnya dan mengirimkan hasil gambar ke chat ini.",
  );
}

async function handleImageGeneration(
  chatId: number,
  prompt: string,
): Promise<void> {
  const startedAt = Date.now();
  const statusMessage = await sendMessage(
    chatId,
    buildLoadingText(startedAt, 0),
  );
  const animation = startLoadingAnimation(
    chatId,
    statusMessage.message_id,
    startedAt,
  );

  try {
    const image = await generateImage(prompt);
    animation.stop();

    const totalElapsed = formatElapsedTime(getElapsedSeconds(startedAt));
    await editMessageText(
      chatId,
      statusMessage.message_id,
      `✅ Selesai dalam ${totalElapsed}. Mengirim hasil gambar...`,
    );

    await sendPhoto(chatId, image);
    await deleteMessage(chatId, statusMessage.message_id);
  } catch (error) {
    animation.stop();

    const totalElapsed = formatElapsedTime(getElapsedSeconds(startedAt));
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await editMessageText(
      chatId,
      statusMessage.message_id,
      `❌ Maaf, terjadi kendala saat memproses gambar setelah ${totalElapsed}.`,
    );
    await sendMessage(chatId, `Detail kesalahan: ${errorMessage}`);
  }
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (!text) {
    return;
  }

  if (isCommand(text, "/start", "/help")) {
    await handleHelpCommand(chatId);
    return;
  }

  await handleImageGeneration(chatId, text);
}

// =============================================================================
// Bot Runner
// =============================================================================

async function runBot(): Promise<never> {
  let offset = 0;

  console.log("Telegram bot aktif. Menunggu pesan masuk...");

  while (true) {
    try {
      const updates = await getUpdates(offset);

      for (const update of updates) {
        offset = update.update_id + 1;

        if (update.message) {
          await handleMessage(update.message);
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
      await Bun.sleep(2000);
    }
  }
}

await runBot();

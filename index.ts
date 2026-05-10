type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    from?: { first_name?: string };
  };
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramMessage = {
  message_id: number;
};

const TELEGRAM_BOT_TOKEN = Bun.env.TELEGRAM_BOT_TOKEN;
const IMAGE_API_URL =
  Bun.env.IMAGE_API_URL ?? "https://images.amiminn.workers.dev";
const IMAGE_API_TOKEN = Bun.env.IMAGE_API_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN in environment");
}

if (!IMAGE_API_TOKEN) {
  throw new Error("Missing IMAGE_API_TOKEN in environment");
}

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function telegramGetUpdates(offset: number): Promise<TelegramUpdate[]> {
  const url = new URL(`${TELEGRAM_API_BASE}/getUpdates`);
  url.searchParams.set("timeout", "30");
  url.searchParams.set("offset", offset.toString());

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Telegram getUpdates failed: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as {
    ok: boolean;
    result?: TelegramUpdate[];
    description?: string;
  };
  if (!body.ok) {
    throw new Error(
      `Telegram getUpdates error: ${body.description ?? "unknown"}`,
    );
  }

  return body.result ?? [];
}

async function telegramSendMessage(
  chatId: number,
  text: string,
): Promise<TelegramMessage> {
  const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Telegram sendMessage failed: ${response.status} ${errorText}`,
    );
  }

  const body = (await response.json()) as TelegramApiResponse<TelegramMessage>;
  if (!body.ok || !body.result) {
    throw new Error(`Telegram sendMessage error: ${body.description ?? "unknown"}`);
  }

  return body.result;
}

async function telegramEditMessageText(
  chatId: number,
  messageId: number,
  text: string,
): Promise<void> {
  const response = await fetch(`${TELEGRAM_API_BASE}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Telegram editMessageText failed: ${response.status} ${errorText}`,
    );
  }
}

async function telegramDeleteMessage(
  chatId: number,
  messageId: number,
): Promise<void> {
  const response = await fetch(`${TELEGRAM_API_BASE}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Telegram deleteMessage failed: ${response.status} ${errorText}`,
    );
  }
}

async function telegramSendPhoto(
  chatId: number,
  image: Uint8Array,
  caption: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("chat_id", chatId.toString());
  formData.append("caption", caption);
  formData.append(
    "photo",
    new Blob([image], { type: "image/jpeg" }),
    "image.jpg",
  );

  const response = await fetch(`${TELEGRAM_API_BASE}/sendPhoto`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Telegram sendPhoto failed: ${response.status} ${errorText}`,
    );
  }
}

async function generateImage(prompt: string): Promise<Uint8Array> {
  const response = await fetch(IMAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${IMAGE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image API failed: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedMinutes = minutes.toString().padStart(2, "0");
  const paddedSeconds = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${paddedMinutes}:${paddedSeconds}`;
}

function buildProcessingText(startTime: number): string {
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  return `Prompt diterima. Sedang memproses permintaan Anda...\n⏱ Waktu berjalan: ${formatElapsedTime(elapsedSeconds)}`;
}

async function handleMessage(
  message: NonNullable<TelegramUpdate["message"]>,
): Promise<void> {
  const chatId = message.chat.id;
  const prompt = message.text?.trim();

  if (!prompt) {
    return;
  }

  if (prompt === "/start" || prompt === "/help") {
    await telegramSendMessage(
      chatId,
      "Silakan kirim prompt teks. Bot akan memprosesnya dan mengirimkan hasil gambar ke chat ini.",
    );
    return;
  }

  const startedAt = Date.now();
  const statusMessage = await telegramSendMessage(
    chatId,
    buildProcessingText(startedAt),
  );

  const timer = setInterval(() => {
    void telegramEditMessageText(
      chatId,
      statusMessage.message_id,
      buildProcessingText(startedAt),
    ).catch((error) => {
      console.error("Failed to update processing timer:", error);
    });
  }, 5000);

  try {
    const image = await generateImage(prompt);
    clearInterval(timer);
    const totalElapsed = formatElapsedTime(
      Math.floor((Date.now() - startedAt) / 1000),
    );
    await telegramEditMessageText(
      chatId,
      statusMessage.message_id,
      `Permintaan selesai dalam ${totalElapsed}. Mengirim hasil gambar...`,
    );
    await telegramSendPhoto(chatId, image, `Prompt: ${prompt}`);
    await telegramDeleteMessage(chatId, statusMessage.message_id);
  } catch (error) {
    clearInterval(timer);
    const totalElapsed = formatElapsedTime(
      Math.floor((Date.now() - startedAt) / 1000),
    );
    const messageText =
      error instanceof Error ? error.message : "Unknown error";
    await telegramEditMessageText(
      chatId,
      statusMessage.message_id,
      `Maaf, terjadi kendala saat memproses gambar setelah ${totalElapsed}.`,
    );
    await telegramSendMessage(chatId, `Detail kesalahan: ${messageText}`);
  }
}

async function runBot(): Promise<void> {
  let offset = 0;

  console.log("Telegram bot aktif. Menunggu pesan masuk...");

  while (true) {
    try {
      const updates = await telegramGetUpdates(offset);

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

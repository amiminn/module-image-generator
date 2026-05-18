# ✨ Free AI Image Generation API (100,000 Calls/Day) ⚡

<div align="center">

![GitHub stars](https://img.shields.io/github/amiminn/module-image-generator?style=social)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)
![AI](https://img.shields.io/badge/AI-Stable%20Diffusion-purple.svg)

**🚀 Deploy your own free AI image generation API in minutes!**

</div>

This project lets you deploy your own **free AI image generation API** using Cloudflare Workers, with up to **100,000 API calls per day**. Generate stunning images from text prompts using powerful models like Stable Diffusion XL! 🎨

## 🎉 Try the Demo

> **👇 Chat with the Telegram bot below to try AI image generation for free! 👇**

[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue.svg?style=for-the-badge&logo=telegram)](http://t.me/VlZDoEmq6OUHhtBggqzB_bot)

**[👉 Click here to open the bot](http://t.me/VlZDoEmq6OUHhtBggqzB_bot)** — Send any prompt and get an AI-generated image instantly! 🎨

---

## ✨ Features

- 🆓 **100,000 free API calls per day** (Cloudflare Workers AI free tier)
- ⚡ **Lightning-fast** image generation from text prompts
- 🛠️ **Easy to deploy** - no coding experience required
- 🔒 **Secure** with API key authentication
- 🎯 **Multiple AI models** available

---

## 🚀 How It Works

- 📤 You deploy a Cloudflare Worker using the provided `worker.js` file
- 🌐 The Worker exposes a simple API endpoint for image generation
- 🔐 You authenticate using your own API key
- 🤖 The Worker uses Cloudflare's free AI models to generate images

---

## 📱 Telegram Bot Setup (BotFather)

### 1. Open BotFather

- Open Telegram and search for **@BotFather**
- Click **Start** to begin

### 2. Create a New Bot

- Send the command: `/newbot`
- BotFather will ask for a **bot name** — e.g., `AI Image Generator`
- Then ask for a **username** — e.g., `my_ai_image_bot` (must end in `bot`)

### 3. Get Your Bot Token

- BotFather will give you a token like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- **Copy and save this token** — you'll need it for the `TELEGRAM_BOT_TOKEN` in your `.env` file

### 4. Configure the Bot

- Set a description: `/setdescription` → choose your bot → enter description
- Set a profile picture: `/setuserpic` → choose your bot → upload an image (optional)

### 5. Add Bot to Your Project

- Copy the token to your `.env` file:
  ```
  TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
  ```
- Run your bot project and start chatting with your bot!

---

## 📋 Setup Instructions

### 1. 🌟 Get a Cloudflare Account

- Sign up at [Cloudflare](https://dash.cloudflare.com/sign-up) if you don't have one

### 2. ⚡ Create a New Worker

- Go to the [Cloudflare Workers dashboard](https://dash.cloudflare.com/workers)
- Click **"Create application"** 🎯
- Choose **"Create Worker"**
- Give it a name like `free-image-generation-api` 📝
- Click **"Deploy"** to create a Hello World worker 🚀

### 3. 🔧 Replace the Worker Code

- In the worker editor, replace the default Hello World code with the `worker.js` code from this repo 📄
- Click **"Save and Deploy"** ✅

### 4. 🔑 Set Up Environment Variables

- In your worker dashboard, go to **"Settings"** > **"Variables"** ⚙️
- Under **"Environment Variables"**, click **"Add variable"** ➕
- Name: `API_KEY` 🏷️
- Value: `your-secret-api-key` (replace with a strong secret key) 🔒
- Click **"Save and Deploy"** 💾

### 5. 🤖 Enable Workers AI

- In the Cloudflare dashboard, go to **"Workers & Pages"** > **"AI"** 🧠
- Enable Workers AI for your account (free tier is enough) 🆓

### 6. 🔗 Add AI Binding to Your Worker

- Go back to your worker's dashboard
- Click on **"Settings"** > **"Variables"** ⚙️
- Scroll down to **"Service bindings"** section
- Click **"Add binding"** ➕
- Variable name: `AI` 🏷️
- Service: Select **"Workers AI"** from dropdown 🤖
- Click **"Save and Deploy"** ✅

> ⚠️ **Important:** Without this AI binding, your worker won't be able to access Cloudflare's AI models!

### 7. 🌐 Get Your Worker URL

- Your worker will be available at: `https://<your-worker-name>.<your-subdomain>.workers.dev` 🔗
- You can find the exact URL in your worker's dashboard 📍

### 8. 📁 Setup Your `.env` File

- Copy `.env.sample` to `.env`:
  ```
  cp .env.sample .env
  ```
- Open `.env` and fill in your values
- ✅ **See valid setup example here:** https://s3.amiminn.com/env.module-image-generator.txt

---

## 🎯 Usage

### 🖥️ cURL Example

```bash
curl -X POST https://<your-worker-name>.<your-subdomain>.workers.dev \
  -H "Authorization: Bearer your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A cute robot cooking breakfast"}' \
  --output image.jpg
```

### 🌐 JavaScript Example

```js
const res = await fetch(
  "https://<your-worker-name>.<your-subdomain>.workers.dev",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer your-secret-api-key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: "A futuristic city in the clouds" }),
  },
);
const blob = await res.blob();
const img = document.createElement("img");
img.src = URL.createObjectURL(blob);
img.style.height = "500px";
document.body.appendChild(img);
```

---

## 📝 Notes

- 🆓 **Free Tier:** Cloudflare Workers AI free tier allows 100,000 AI requests per day. See [Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) for details.
- 🎨 **Models:** You can change the model in `worker.js` to use other available models (see comments in the file).
- 🔒 **Security:** Keep your API key secret. Rotate it if needed.

---

## 📄 License

MIT License ⭐

---

<div align="center">

**⭐ Star this repo if it helped you! ⭐**

</div>

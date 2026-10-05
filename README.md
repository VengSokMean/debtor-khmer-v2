# DebtTrack KH v2

Responsive debtor system for phone + desktop.

## Features
- Khmer / English language switch
- USD ($) and Cambodian Riel (៛) currency selector
- Separate USD and KHR totals
- Name, phone, amount, debt date, deadline, invoice image, note
- Unpaid / Overdue / Paid status
- Search and filter
- Mobile card layout + desktop table
- LocalStorage so data stays in the same browser
- Telegram message when a debt is added and when marked paid (when server is running)

## Run without Telegram
Open `index.html`. Data saves in your browser.

## Run with Telegram
1. Create a Telegram bot using BotFather and get the bot token.
2. Get your Telegram Chat ID.
3. Open `server` folder.
4. Run: `npm install`
5. Copy `.env.example` to `.env` and add BOT_TOKEN and CHAT_ID.
6. Run: `npm start`
7. Open http://localhost:3000

## Important about automatic deadline alerts
A webpage cannot send reliable alerts while it is closed. For automatic deadline reminders, the server must be hosted 24/7 and the debt records must also be stored server-side (database/JSON service). This starter sends Telegram alerts for Add Debt and Paid. The next production step is server-side storage + scheduled deadline checking.

Never put BOT_TOKEN inside app.js or index.html.

## MongoDB Cloud version
This version stores debts in MongoDB Atlas through Netlify Functions.
Required Netlify environment variables: MONGODB_URI, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
API test: /api/test-db

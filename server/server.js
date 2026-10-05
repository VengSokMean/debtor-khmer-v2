import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";


/* =====================================================
   PATH
===================================================== */

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );


/* =====================================================
   ENV
===================================================== */

dotenv.config({
    path:
        path.join(
            __dirname,
            ".env"
        )
});


/* =====================================================
   SERVER
===================================================== */

const app =
    express();


const PORT =
    process.env.PORT ||
    3000;


const BOT_TOKEN =
    process.env
        .TELEGRAM_BOT_TOKEN
        ?.trim();


const CHAT_ID =
    process.env
        .TELEGRAM_CHAT_ID
        ?.trim();


app.use(
    express.json({
        limit: "10mb"
    })
);


app.use(
    express.urlencoded({
        extended: true
    })
);


/* =====================================================
   ESCAPE TELEGRAM HTML
===================================================== */

function telegramEscape(value) {

    return String(
        value || "-"
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        );
}


/* =====================================================
   FORMAT MONEY
===================================================== */

function formatMoney(debt) {

    const amount =
        Number(
            debt.amount || 0
        );


    if (
        debt.currency ===
        "USD"
    ) {

        return (
            "$" +
            amount.toLocaleString(
                undefined,
                {
                    minimumFractionDigits:
                        2,

                    maximumFractionDigits:
                        2
                }
            )
        );
    }


    return (
        amount.toLocaleString() +
        "៛"
    );
}


/* =====================================================
   TELEGRAM
===================================================== */

async function sendTelegramMessage(
    message
) {

    if (!BOT_TOKEN) {

        console.log(
            "❌ TELEGRAM_BOT_TOKEN missing"
        );


        return {

            success: false,

            error:
                "TELEGRAM_BOT_TOKEN missing"
        };
    }


    if (!CHAT_ID) {

        console.log(
            "❌ TELEGRAM_CHAT_ID missing"
        );


        return {

            success: false,

            error:
                "TELEGRAM_CHAT_ID missing"
        };
    }


    try {

        const url =
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;


        const response =
            await fetch(
                url,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            chat_id:
                                CHAT_ID,

                            text:
                                message,

                            parse_mode:
                                "HTML"

                        })
                }
            );


        const result =
            await response.json();


        console.log(
            "Telegram:",
            result
        );


        if (!result.ok) {

            return {

                success: false,

                error_code:
                    result.error_code,

                error:
                    result.description
            };
        }


        return {

            success: true,

            result:
                result.result
        };


    } catch (error) {

        console.error(
            "Telegram Error:",
            error
        );


        return {

            success: false,

            error:
                error.message
        };
    }
}


/* =====================================================
   TEST
===================================================== */

app.get(
    "/api/test-telegram",

    async (req, res) => {

        const telegram =
            await sendTelegramMessage(`

🤖 <b>DebtTrack KH</b>

✅ Telegram message sent successfully!

🇰🇭 Telegram Bot បានភ្ជាប់ដោយជោគជ័យ។

            `.trim());


        if (
            telegram.success
        ) {

            return res.json({

                success: true,

                message:
                    "Telegram message sent successfully!"

            });
        }


        res.status(500)
            .json({

                success: false,

                error_code:
                    telegram.error_code ||
                    null,

                error:
                    telegram.error

            });
    }
);


/* =====================================================
   NEW DEBT
===================================================== */

app.post(
    "/api/debt",

    async (req, res) => {

        try {

            const debt =
                req.body;


            const message = `

💰 <b>NEW DEBT / បំណុលថ្មី</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Name / ឈ្មោះ:</b>
${telegramEscape(debt.name)}

📱 <b>Phone / លេខទូរស័ព្ទ:</b>
${telegramEscape(debt.phone)}

💵 <b>Amount / ចំនួនទឹកប្រាក់:</b>
${formatMoney(debt)}

💱 <b>Currency / រូបិយប័ណ្ណ:</b>
${telegramEscape(debt.currency)}

📅 <b>Debt Date / ថ្ងៃជំពាក់:</b>
${telegramEscape(debt.debtDate)}

⏰ <b>Deadline / ថ្ងៃកំណត់សង:</b>
${telegramEscape(debt.deadline)}

📝 <b>Note / កំណត់ចំណាំ:</b>
${telegramEscape(debt.note)}

🔵 <b>Status:</b>
UNPAID / មិនទាន់សង

━━━━━━━━━━━━━━━━━━

🗂 DebtTrack KH

            `.trim();


            const telegram =
                await sendTelegramMessage(
                    message
                );


            res.json({

                success: true,

                telegram:
                    telegram.success,

                telegramError:
                    telegram.error ||
                    null
            });


        } catch (error) {

            console.error(
                "NEW DEBT:",
                error
            );


            res.status(500)
                .json({

                    success: false,

                    error:
                        error.message
                });
        }
    }
);


/* =====================================================
   UPDATE DEBT
===================================================== */

app.post(
    "/api/update",

    async (req, res) => {

        try {

            const debt =
                req.body;


            const message = `

✏️ <b>DEBT UPDATED / បានកែប្រែបំណុល</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Name / ឈ្មោះ:</b>
${telegramEscape(debt.name)}

📱 <b>Phone / លេខទូរស័ព្ទ:</b>
${telegramEscape(debt.phone)}

💵 <b>Amount / ចំនួនទឹកប្រាក់:</b>
${formatMoney(debt)}

💱 <b>Currency:</b>
${telegramEscape(debt.currency)}

📅 <b>Debt Date:</b>
${telegramEscape(debt.debtDate)}

⏰ <b>Deadline:</b>
${telegramEscape(debt.deadline)}

📝 <b>Note:</b>
${telegramEscape(debt.note)}

🟠 <b>Status:</b>
UPDATED / បានកែប្រែ

━━━━━━━━━━━━━━━━━━

🗂 DebtTrack KH

            `.trim();


            const telegram =
                await sendTelegramMessage(
                    message
                );


            res.json({

                success: true,

                telegram:
                    telegram.success,

                telegramError:
                    telegram.error ||
                    null
            });


        } catch (error) {

            console.error(
                "UPDATE:",
                error
            );


            res.status(500)
                .json({

                    success: false,

                    error:
                        error.message
                });
        }
    }
);


/* =====================================================
   PAID
===================================================== */

app.post(
    "/api/paid",

    async (req, res) => {

        try {

            const debt =
                req.body;


            const message = `

✅ <b>DEBT PAID / បានសងបំណុល</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Name / ឈ្មោះ:</b>
${telegramEscape(debt.name)}

📱 <b>Phone:</b>
${telegramEscape(debt.phone)}

💵 <b>Amount:</b>
${formatMoney(debt)}

📅 <b>Debt Date:</b>
${telegramEscape(debt.debtDate)}

⏰ <b>Deadline:</b>
${telegramEscape(debt.deadline)}

📝 <b>Note:</b>
${telegramEscape(debt.note)}

🟢 <b>Status:</b>
PAID / បានសង

━━━━━━━━━━━━━━━━━━

🗂 DebtTrack KH

            `.trim();


            const telegram =
                await sendTelegramMessage(
                    message
                );


            res.json({

                success: true,

                telegram:
                    telegram.success,

                telegramError:
                    telegram.error ||
                    null
            });


        } catch (error) {

            console.error(
                "PAID:",
                error
            );


            res.status(500)
                .json({

                    success: false,

                    error:
                        error.message
                });
        }
    }
);


/* =====================================================
   DELETE DEBT
===================================================== */

app.post(
    "/api/delete",

    async (req, res) => {

        try {

            const debt =
                req.body;


            console.log(
                "Deleting debt:",
                debt.name
            );


            const message = `

🗑 <b>DEBT DELETED / បានលុបបំណុល</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Name / ឈ្មោះ:</b>
${telegramEscape(debt.name)}

📱 <b>Phone / លេខទូរស័ព្ទ:</b>
${telegramEscape(debt.phone)}

💵 <b>Amount / ចំនួនទឹកប្រាក់:</b>
${formatMoney(debt)}

💱 <b>Currency / រូបិយប័ណ្ណ:</b>
${telegramEscape(debt.currency)}

📅 <b>Debt Date / ថ្ងៃជំពាក់:</b>
${telegramEscape(debt.debtDate)}

⏰ <b>Deadline / ថ្ងៃកំណត់សង:</b>
${telegramEscape(debt.deadline)}

📝 <b>Note / កំណត់ចំណាំ:</b>
${telegramEscape(debt.note)}

🔴 <b>Status / ស្ថានភាព:</b>
DELETED / បានលុប

━━━━━━━━━━━━━━━━━━

🗂 DebtTrack KH

            `.trim();


            const telegram =
                await sendTelegramMessage(
                    message
                );


            console.log(
                "Delete Telegram:",
                telegram
            );


            res.json({

                success: true,

                telegram:
                    telegram.success,

                telegramError:
                    telegram.error ||
                    null
            });


        } catch (error) {

            console.error(
                "DELETE:",
                error
            );


            res.status(500)
                .json({

                    success: false,

                    error:
                        error.message
                });
        }
    }
);


/* =====================================================
   FRONTEND
===================================================== */

const frontendPath =
    path.join(
        __dirname,
        ".."
    );


app.use(
    express.static(
        frontendPath
    )
);


app.get(
    "/",

    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "index.html"
            )
        );
    }
);


/* =====================================================
   SERVER
===================================================== */

app.listen(
    PORT,

    () => {

        console.log("");
        console.log(
            "================================"
        );

        console.log(
            "       DEBTTRACK KH"
        );

        console.log(
            "================================"
        );

        console.log(
            `🌐 Website: http://localhost:${PORT}`
        );


        console.log(

            BOT_TOKEN

                ? "✅ Bot Token: Loaded"

                : "❌ Bot Token: Missing"
        );


        console.log(

            CHAT_ID

                ? "✅ Chat ID: Loaded"

                : "❌ Chat ID: Missing"
        );


        console.log(
            "================================"
        );

        console.log(
            `🧪 Test: http://localhost:${PORT}/api/test-telegram`
        );

        console.log(
            "================================"
        );

        console.log("");
    }
);
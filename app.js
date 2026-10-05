/* =========================================================
   DebtTrack KH
   Add / Edit / Delete / Paid
   Khmer + English
   USD + KHR
   LocalStorage + Telegram
========================================================= */

const I = {
    en: {
        title: "Debtor Dashboard",
        subtitle: "Track debt, deadlines and payments.",
        add: "+ Add Debt",
        usd: "Total USD",
        khr: "Total KHR",
        unpaid: "Unpaid",
        overdue: "Overdue",
        paid: "Paid",
        newDebt: "New Debt",
        editDebt: "Edit Debt",
        name: "Debtor Name",
        phone: "Phone",
        amount: "Amount",
        currency: "Currency",
        debtDate: "Debt Date",
        deadline: "Deadline",
        invoice: "Invoice Image",
        note: "Note",
        cancel: "Cancel",
        save: "Save Debt",
        update: "Update Debt",
        all: "All",
        debts: "Debt Records",
        status: "Status",
        action: "Action",
        empty: "No debt records yet.",
        home: "Home",
        addShort: "Add",
        search: "Search name or phone...",
        markPaid: "Mark Paid",
        edit: "Edit",
        delete: "Delete",
        confirmDelete: "Are you sure you want to delete this debt?",
        confirmPaid: "Mark this debt as paid?",
        saved: "Debt saved successfully",
        updated: "Debt updated successfully",
        deleted: "Debt deleted successfully",
        paidSuccess: "Debt marked as paid",
        dueToday: "Due today",
        daysLeft: "days left",
        daysOverdue: "days overdue"
    },

    km: {
        title: "ផ្ទាំងគ្រប់គ្រងបំណុល",
        subtitle: "តាមដានបំណុល ថ្ងៃកំណត់ និងការទូទាត់",
        add: "+ បន្ថែមបំណុល",
        usd: "បំណុលសរុប USD",
        khr: "បំណុលសរុប រៀល",
        unpaid: "មិនទាន់សង",
        overdue: "ហួសកំណត់",
        paid: "បានសង",
        newDebt: "បំណុលថ្មី",
        editDebt: "កែប្រែបំណុល",
        name: "ឈ្មោះអ្នកជំពាក់",
        phone: "លេខទូរស័ព្ទ",
        amount: "ចំនួនទឹកប្រាក់",
        currency: "រូបិយប័ណ្ណ",
        debtDate: "ថ្ងៃជំពាក់",
        deadline: "ថ្ងៃកំណត់សង",
        invoice: "រូបវិក្កយបត្រ",
        note: "កំណត់ចំណាំ",
        cancel: "បោះបង់",
        save: "រក្សាទុក",
        update: "រក្សាទុកការកែប្រែ",
        all: "ទាំងអស់",
        debts: "បញ្ជីបំណុល",
        status: "ស្ថានភាព",
        action: "សកម្មភាព",
        empty: "មិនទាន់មានទិន្នន័យបំណុល",
        home: "ទំព័រដើម",
        addShort: "បន្ថែម",
        search: "ស្វែងរកឈ្មោះ ឬលេខទូរស័ព្ទ...",
        markPaid: "បានសង",
        edit: "កែប្រែ",
        delete: "លុប",
        confirmDelete: "តើអ្នកពិតជាចង់លុបបំណុលនេះមែនទេ?",
        confirmPaid: "តើអ្នកចង់កំណត់ថាបានសងហើយមែនទេ?",
        saved: "បានរក្សាទុកបំណុល",
        updated: "បានកែប្រែបំណុលដោយជោគជ័យ",
        deleted: "បានលុបបំណុលដោយជោគជ័យ",
        paidSuccess: "បានកំណត់ថាបានសងរួច",
        dueToday: "ដល់ថ្ងៃសងថ្ងៃនេះ",
        daysLeft: "ថ្ងៃទៀត",
        daysOverdue: "ថ្ងៃហួសកំណត់"
    }
};


/* =========================================================
   DATA
========================================================= */

let lang =
    localStorage.getItem("debtLang") || "en";

let debts = [];

let editingId = null;


/* =========================================================
   HELPERS
========================================================= */

const $ = id =>
    document.getElementById(id);


function t(key) {
    return I[lang][key] || key;
}


async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok || result.success === false) {
        throw new Error(result.error || `Request failed (${response.status})`);
    }
    return result;
}

async function loadDebts() {
    try {
        const result = await apiRequest("/api/debts");
        debts = result.debts || [];
        render();
    } catch (error) {
        console.error("Load debts error:", error);
        toast(lang === "km" ? "មិនអាចទាញទិន្នន័យពី Cloud បាន" : "Could not load cloud data", "delete");
    }
}


function todayDate() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function esc(value) {

    return String(value || "")
        .replace(
            /[&<>"']/g,

            c => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[c]
        );
}


function money(debt) {

    const amount =
        Number(debt.amount || 0);

    if (debt.currency === "USD") {

        return "$" +
            amount.toLocaleString(
                undefined,
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
    }

    return (
        amount.toLocaleString() +
        "៛"
    );
}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    const parts =
        value.split("-");

    if (parts.length !== 3) {
        return value;
    }

    return (
        `${parts[2]}/${parts[1]}/${parts[0]}`
    );
}


/* =========================================================
   STATUS
========================================================= */

function status(debt) {

    if (debt.paid) {
        return "paid";
    }

    if (
        debt.deadline &&
        debt.deadline < todayDate()
    ) {
        return "overdue";
    }

    return "unpaid";
}


function deadlineInfo(debt) {

    if (debt.paid) {
        return t("paid");
    }

    if (!debt.deadline) {
        return "-";
    }

    const today =
        new Date(
            todayDate() + "T00:00:00"
        );

    const deadline =
        new Date(
            debt.deadline + "T00:00:00"
        );

    const diff =
        Math.round(
            (deadline - today) /
            86400000
        );

    if (diff === 0) {
        return t("dueToday");
    }

    if (diff > 0) {

        return (
            `${diff} ${t("daysLeft")}`
        );
    }

    return (
        `${Math.abs(diff)} ${t("daysOverdue")}`
    );
}


/* =========================================================
   LANGUAGE
========================================================= */

function applyLang() {

    document.documentElement.lang =
        lang === "km"
            ? "km"
            : "en";

    document.body.classList.toggle(
        "khmer",
        lang === "km"
    );

    document
        .querySelectorAll("[data-i]")
        .forEach(element => {

            element.textContent =
                t(element.dataset.i);
        });


    document
        .querySelectorAll("[data-ph]")
        .forEach(element => {

            element.placeholder =
                t(element.dataset.ph);
        });


    if ($("langBtn")) {

        $("langBtn").textContent =
            lang === "en"
                ? "ខ្មែរ"
                : "English";
    }

    updateFormTitle();

    render();
}


if ($("langBtn")) {

    $("langBtn").onclick = () => {

        lang =
            lang === "en"
                ? "km"
                : "en";

        localStorage.setItem(
            "debtLang",
            lang
        );

        applyLang();
    };
}


/* =========================================================
   FORM
========================================================= */

function updateFormTitle() {

    const title =
        document.querySelector(
            "#formPanel .panel-head h2"
        );

    const saveButton =
        document.querySelector(
            "#debtForm .save-btn"
        );


    if (title) {

        title.textContent =
            editingId
                ? t("editDebt")
                : t("newDebt");
    }


    if (saveButton) {

        saveButton.textContent =
            editingId
                ? t("update")
                : t("save");
    }
}


function clearForm() {

    $("debtForm").reset();

    editingId = null;

    $("debtDate").value =
        todayDate();

    updateFormTitle();
}


function showForm() {

    clearForm();

    $("formPanel")
        .classList
        .remove("hidden");

    setTimeout(
        () => {

            $("formPanel")
                .scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

        },
        50
    );

    setTimeout(
        () => {

            $("name").focus();

        },
        350
    );
}


function hideForm() {

    $("formPanel")
        .classList
        .add("hidden");

    clearForm();
}


/* =========================================================
   EDIT
========================================================= */

function editDebt(id) {

    const debt =
        debts.find(
            item =>
                item.id === id
        );

    if (!debt) {
        return;
    }


    editingId = id;


    $("name").value =
        debt.name || "";

    $("phone").value =
        debt.phone || "";

    $("amount").value =
        debt.amount || "";

    $("currency").value =
        debt.currency || "USD";

    $("debtDate").value =
        debt.debtDate ||
        todayDate();

    $("deadline").value =
        debt.deadline || "";

    $("note").value =
        debt.note || "";


    $("formPanel")
        .classList
        .remove("hidden");


    updateFormTitle();


    setTimeout(
        () => {

            $("formPanel")
                .scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

        },
        50
    );
}


/* =========================================================
   IMAGE
========================================================= */

function fileData(file) {

    return new Promise(
        resolve => {

            if (!file) {

                resolve("");

                return;
            }

            const reader =
                new FileReader();

            reader.onload =
                () => {

                    resolve(
                        reader.result
                    );
                };

            reader.readAsDataURL(
                file
            );
        }
    );
}


/* =========================================================
   CLOUD CRUD - MONGODB VIA NETLIFY API
========================================================= */

$("debtForm").onsubmit = async event => {
    event.preventDefault();

    const name = $("name").value.trim();
    const phone = $("phone").value.trim();
    const amount = Number($("amount").value);
    const currency = $("currency").value;
    const debtDate = $("debtDate").value;
    const deadline = $("deadline").value;
    const note = $("note").value.trim();

    if (!name) { alert(lang === "km" ? "សូមបញ្ចូលឈ្មោះអ្នកជំពាក់" : "Please enter debtor name."); return; }
    if (!amount || amount <= 0) { alert(lang === "km" ? "សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ" : "Please enter a valid amount."); return; }
    if (!debtDate) { alert(lang === "km" ? "សូមជ្រើសរើសថ្ងៃជំពាក់" : "Please select debt date."); return; }
    if (!deadline) { alert(lang === "km" ? "សូមជ្រើសរើសថ្ងៃកំណត់សង" : "Please select deadline."); return; }
    if (deadline < debtDate) { alert(lang === "km" ? "ថ្ងៃកំណត់សងមិនអាចមុនថ្ងៃជំពាក់បានទេ" : "Deadline cannot be before debt date."); return; }

    const selectedFile = $("invoice").files[0];
    const newImage = await fileData(selectedFile);

    try {
        if (editingId) {
            const oldDebt = debts.find(d => d.id === editingId);
            if (!oldDebt) return;
            const payload = { ...oldDebt, name, phone, amount, currency, debtDate, deadline, note, image: newImage || oldDebt.image || "" };
            const result = await apiRequest(`/api/debt/${editingId}`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            });
            const index = debts.findIndex(d => d.id === editingId);
            debts[index] = result.debt;
            render(); toast(t("updated"), "success"); hideForm();
            return;
        }

        const payload = { name, phone, amount, currency, debtDate, deadline, note, image: newImage, paid: false };
        const result = await apiRequest("/api/debt", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        debts.unshift(result.debt);
        render(); toast(t("saved"), "success"); hideForm();
    } catch (error) {
        console.error("Save debt error:", error);
        alert((lang === "km" ? "រក្សាទុកមិនបាន: " : "Could not save: ") + error.message);
    }
};

async function markPaid(id) {
    const debt = debts.find(item => item.id === id);
    if (!debt || !confirm(t("confirmPaid"))) return;
    try {
        const result = await apiRequest(`/api/debt/${id}/paid`, { method: "PATCH" });
        const index = debts.findIndex(item => item.id === id);
        debts[index] = result.debt;
        render(); toast(t("paidSuccess"), "success");
    } catch (error) {
        alert((lang === "km" ? "កំណត់ការសងមិនបាន: " : "Could not mark paid: ") + error.message);
    }
}

async function removeDebt(id) {
    const debt = debts.find(item => item.id === id);
    if (!debt || !confirm(t("confirmDelete"))) return;
    try {
        await apiRequest(`/api/debt/${id}`, { method: "DELETE" });
        debts = debts.filter(item => item.id !== id);
        render(); toast(t("deleted"), "delete");
    } catch (error) {
        alert((lang === "km" ? "លុបមិនបាន: " : "Could not delete: ") + error.message);
    }
}

/* =========================================================
   RENDER
========================================================= */

function render() {

    const search =
        $("search")
            .value
            .trim()
            .toLowerCase();


    const filter =
        $("filter").value;


    const list =
        debts.filter(
            debt => {

                const matchSearch =

                    (debt.name || "")
                        .toLowerCase()
                        .includes(search)

                    ||

                    (debt.phone || "")
                        .includes(search);


                const matchFilter =

                    filter === "all"

                    ||

                    status(debt) ===
                    filter;


                return (
                    matchSearch &&
                    matchFilter
                );
            }
        );


    /* USD TOTAL */

    const usd =
        debts
            .filter(
                debt =>
                    !debt.paid &&
                    debt.currency ===
                    "USD"
            )
            .reduce(
                (total, debt) =>
                    total +
                    Number(
                        debt.amount
                    ),
                0
            );


    /* KHR TOTAL */

    const khr =
        debts
            .filter(
                debt =>
                    !debt.paid &&
                    debt.currency ===
                    "KHR"
            )
            .reduce(
                (total, debt) =>
                    total +
                    Number(
                        debt.amount
                    ),
                0
            );


    $("usdTotal").textContent =
        "$" +
        usd.toLocaleString(
            undefined,
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        );


    $("khrTotal").textContent =
        khr.toLocaleString() +
        "៛";


    $("unpaidCount").textContent =
        debts.filter(
            debt =>
                status(debt) ===
                "unpaid"
        ).length;


    $("overdueCount").textContent =
        debts.filter(
            debt =>
                status(debt) ===
                "overdue"
        ).length;


    $("recordCount").textContent =
        list.length;


    /* =====================================================
       DESKTOP
    ===================================================== */

    $("rows").innerHTML =
        list.map(
            debt => {

                const currentStatus =
                    status(debt);


                return `

<tr>

    <td>

        <div class="debtor-info">

            ${
                debt.image

                    ? `

                    <img
                        class="invoice-thumb"
                        src="${debt.image}"
                        alt="Invoice"
                        onclick="viewInvoice('${debt.id}')"
                    >

                    `

                    : `

                    <div class="avatar">
                        ${esc(
                            (debt.name || "?")
                                .charAt(0)
                                .toUpperCase()
                        )}
                    </div>

                    `
            }


            <div>

                <b class="debtor-name">
                    ${esc(debt.name)}
                </b>

                <small class="debtor-phone">
                    ${esc(
                        debt.phone ||
                        "-"
                    )}
                </small>

            </div>

        </div>

    </td>


    <td>

        <strong class="amount-value">
            ${money(debt)}
        </strong>

        <small class="currency-text">
            ${esc(debt.currency)}
        </small>

    </td>


    <td>

        ${formatDate(
            debt.debtDate
        )}

    </td>


    <td>

        <strong>
            ${formatDate(
                debt.deadline
            )}
        </strong>

        <small
            class="deadline-info ${currentStatus}"
        >
            ${deadlineInfo(debt)}
        </small>

    </td>


    <td>

        <span
            class="badge ${currentStatus}"
        >
            ${t(currentStatus)}
        </span>

    </td>


    <td>

        <div class="row-actions">

            <button
                class="edit-btn"
                onclick="editDebt('${debt.id}')"
                title="${t("edit")}"
            >
                ✏️
            </button>


            ${
                !debt.paid

                    ? `

                    <button
                        class="paid-btn"
                        onclick="markPaid('${debt.id}')"
                        title="${t("markPaid")}"
                    >
                        ✓
                    </button>

                    `

                    : ""
            }


            <button
                class="delete-btn"
                onclick="removeDebt('${debt.id}')"
                title="${t("delete")}"
            >
                🗑
            </button>

        </div>

    </td>

</tr>

                `;
            }
        ).join("");


    /* =====================================================
       MOBILE
    ===================================================== */

    $("cards").innerHTML =
        list.map(
            debt => {

                const currentStatus =
                    status(debt);


                return `

<article class="debt-card">

    <div class="card-top">

        <div class="mobile-person">

            ${
                debt.image

                    ? `

                    <img
                        class="mobile-invoice"
                        src="${debt.image}"
                        alt="Invoice"
                        onclick="viewInvoice('${debt.id}')"
                    >

                    `

                    : `

                    <div class="avatar">

                        ${esc(
                            (debt.name || "?")
                                .charAt(0)
                                .toUpperCase()
                        )}

                    </div>

                    `
            }


            <div>

                <h3>
                    ${esc(debt.name)}
                </h3>

                <small>
                    ${esc(
                        debt.phone ||
                        "-"
                    )}
                </small>

            </div>

        </div>


        <span
            class="badge ${currentStatus}"
        >
            ${t(currentStatus)}
        </span>

    </div>


    <div class="mobile-amount">

        ${money(debt)}

    </div>


    <div class="mobile-info">

        <div>

            <span>
                ${t("debtDate")}
            </span>

            <strong>
                ${formatDate(
                    debt.debtDate
                )}
            </strong>

        </div>


        <div>

            <span>
                ${t("deadline")}
            </span>

            <strong>
                ${formatDate(
                    debt.deadline
                )}
            </strong>

        </div>

    </div>


    <div
        class="mobile-deadline ${currentStatus}"
    >

        ${deadlineInfo(debt)}

    </div>


    ${
        debt.note

            ? `

            <div class="mobile-note">

                📝
                ${esc(debt.note)}

            </div>

            `

            : ""
    }


    <div class="card-bottom">

        <button
            class="mobile-edit-btn"
            onclick="editDebt('${debt.id}')"
        >
            ✏️ ${t("edit")}
        </button>


        ${
            !debt.paid

                ? `

                <button
                    class="mobile-paid-btn"
                    onclick="markPaid('${debt.id}')"
                >
                    ✓ ${t("markPaid")}
                </button>

                `

                : ""
        }


        <button
            class="mobile-delete-btn"
            onclick="removeDebt('${debt.id}')"
        >
            🗑
        </button>

    </div>

</article>

                `;
            }
        ).join("");


    $("empty").style.display =
        list.length
            ? "none"
            : "block";
}


/* =========================================================
   VIEW INVOICE
========================================================= */

function viewInvoice(id) {

    const debt =
        debts.find(
            item =>
                item.id === id
        );


    if (
        !debt ||
        !debt.image
    ) {
        return;
    }


    const win =
        window.open();


    if (!win) {
        return;
    }


    win.document.write(`

<html>

<head>

<title>Invoice</title>

<style>

body {

    margin: 0;

    background: #111827;

    display: flex;

    align-items: center;

    justify-content: center;

    min-height: 100vh;
}

img {

    max-width: 95%;

    max-height: 95vh;

    object-fit: contain;
}

</style>

</head>

<body>

<img src="${debt.image}">

</body>

</html>

    `);
}


/* =========================================================
   TOAST
========================================================= */

function toast(
    message,
    type = "success"
) {

    document
        .querySelectorAll(
            ".dynamic-toast"
        )
        .forEach(
            element =>
                element.remove()
        );


    const element =
        document.createElement(
            "div"
        );


    element.className =
        `dynamic-toast ${type}`;


    element.innerHTML = `

<span class="toast-check">

    ${
        type === "delete"
            ? "🗑"
            : "✓"
    }

</span>

<span>
    ${esc(message)}
</span>

    `;


    document.body.appendChild(
        element
    );


    requestAnimationFrame(
        () => {

            element
                .classList
                .add("show");
        }
    );


    setTimeout(
        () => {

            element
                .classList
                .remove("show");


            setTimeout(
                () => {

                    element.remove();

                },
                250
            );

        },
        2300
    );
}


/* =========================================================
   SEARCH
========================================================= */

$("search").oninput =
    render;


$("filter").onchange =
    render;


/* =========================================================
   START
========================================================= */

$("formPanel")
    .classList
    .add("hidden");


$("debtDate").value =
    todayDate();


applyLang();
loadDebts();
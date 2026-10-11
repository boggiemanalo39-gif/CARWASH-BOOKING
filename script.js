// ===== DEFAULT SERVICES =====
const DEFAULT_SERVICES = [
    { name: "Exterior Wash", minutes: 20, price: 150 },
    { name: "Interior Cleaning", minutes: 30, price: 200 },
    { name: "Full Wash (Interior + Exterior)", minutes: 50, price: 300 },
    { name: "Premium Wash + Wax", minutes: 75, price: 450 },
    { name: "Deluxe (Wash + Polish + Disinfect)", minutes: 90, price: 600 }
];

document.addEventListener("DOMContentLoaded", () => {
    // Initialize services if empty
    if (!localStorage.getItem("carWashServices")) {
        localStorage.setItem("carWashServices", JSON.stringify(DEFAULT_SERVICES));
    }

    loadServicesToDropdown();
    loadBookings();
    setTodayDate();

    // Auto compute END TIME & PRICE
    document.getElementById("serviceType").addEventListener("change", computeEndTimeAndPrice);
    document.getElementById("startTime").addEventListener("change", computeEndTimeAndPrice);

    // Buttons
    document.getElementById("genRefBtn").addEventListener("click", generateRefId);
    document.getElementById("bookingForm").addEventListener("submit", saveBooking);
    document.getElementById("cancelEdit").addEventListener("click", cancelEdit);
    document.getElementById("settingsBtn").addEventListener("click", openSettings);
    document.querySelector("#settingsModal .close-btn").addEventListener("click", () => closeSettings());
    document.querySelector("#receiptModal .close-btn").addEventListener("click", () => {
        document.getElementById("receiptModal").style.display = "none";
    });
    document.getElementById("saveServiceBtn").addEventListener("click", saveService);
    document.getElementById("clearServiceBtn").addEventListener("click", clearServiceForm);
});

// ===== Get Services from Storage =====
function getServices() {
    return JSON.parse(localStorage.getItem("carWashServices") || "[]");
}

// ===== Load Services to Dropdown =====
function loadServicesToDropdown() {
    const sel = document.getElementById("serviceType");
    sel.innerHTML = `<option value="">-- Select Service --</option>`;
    getServices().forEach(svc => {
        const opt = document.createElement("option");
        opt.value = svc.name;
        opt.dataset.minutes = svc.minutes;
        opt.dataset.price = svc.price;
        opt.textContent = `${svc.name} — ${svc.minutes} mins — ₱${svc.price}`;
        sel.appendChild(opt);
    });
}

// ===== Set Today Date =====
function setTodayDate() {
    document.getElementById("bookingDate").value = new Date().toISOString().split("T")[0];
}

// ⏰ AUTO COMPUTE End Time & Price
function computeEndTimeAndPrice() {
    const sel = document.getElementById("serviceType");
    const opt = sel.selectedOptions[0];
    const startTime = document.getElementById("startTime").value;

    if (!opt || !startTime || !opt.dataset.minutes) {
        document.getElementById("endTime").value = "";
        document.getElementById("totalAmount").value = "";
        return;
    }

    const minutes = parseInt(opt.dataset.minutes);
    const price = parseFloat(opt.dataset.price);
    const [h, m] = startTime.split(":").map(Number);
    const totalMins = h * 60 + m + minutes;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;

    document.getElementById("endTime").value =
        String(endH).padStart(2, "0") + ":" + String(endM).padStart(2, "0");
    document.getElementById("totalAmount").value = price;
}

// ===== Generate Reference ID =====
function generateRefId() {
    const ref = "CW-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    document.getElementById("referenceId").value = ref;
}

// ===== SAVE BOOKING (Add or Edit) =====
function saveBooking(e) {
    e.preventDefault();

    const booking = {
        id: document.getElementById("referenceId").value || ("CW-" + Date.now()),
        ownerName: document.getElementById("ownerName").value,
        bookingDate: document.getElementById("bookingDate").value,
        startTime: document.getElementById("startTime").value,
        endTime: document.getElementById("endTime").value,
        vehicleDetails: document.getElementById("vehicleDetails").value,
        serviceType: document.getElementById("serviceType").value,
        totalAmount: document.getElementById("totalAmount").value,
        paymentStatus: document.getElementById("paymentStatus").value,
        serviceStatus: document.querySelector('input[name="serviceStatus"]:checked').value
    };

    if (!booking.ownerName || !booking.vehicleDetails || !booking.serviceType) {
        alert("⚠️ Please fill in all required fields!");
        return;
    }

    let bookings = JSON.parse(localStorage.getItem("carWashBookings") || "[]");
    const editIdx = document.getElementById("editIndex").value;

    if (editIdx !== "") {
        // ✏️ UPDATE existing
        bookings[editIdx] = booking;
        alert("✅ Booking Updated!");
    } else {
        // ➕ ADD new
        bookings.push(booking);
        alert("✅ Booking Saved!");
    }

    localStorage.setItem("carWashBookings", JSON.stringify(bookings));
    cancelEdit();
    loadBookings();
}

// ===== LOAD BOOKINGS =====
function loadBookings() {
    const tbody = document.getElementById("recordsBody");
    const bookings = JSON.parse(localStorage.getItem("carWashBookings") || "[]");
    tbody.innerHTML = "";

    bookings.forEach((bk, idx) => {
        let statusClass = {
            "Pending": "status-pending",
            "In Progress": "status-inprogress",
            "Completed": "status-completed",
            "Cancelled": "status-cancelled"
        }[bk.serviceStatus] || "";

        let payClass = {
            "Paid": "paid",
            "Unpaid": "unpaid",
            "Partial": "partial"
        }[bk.paymentStatus] || "";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${bk.id}</td>
            <td>${bk.ownerName}</td>
            <td>${bk.vehicleDetails}</td>
            <td>${bk.serviceType.split(" — ")[0]}</td>
            <td>${bk.bookingDate}</td>
            <td>${bk.startTime}</td>
            <td>${bk.endTime}</td>
            <td>₱${bk.totalAmount}</td>
            <td class="${payClass}">${bk.paymentStatus}</td>
            <td class="${statusClass}">${bk.serviceStatus}</td>
            <td>
                <button class="action-btn edit-btn" data-idx="${idx}">✏️ Edit</button>
                <button class="action-btn print-btn" data-idx="${idx}">🧾 Receipt</button>
                <button class="action-btn delete-btn" data-idx="${idx}">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Attach button events
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", (e) => editBooking(parseInt(e.target.dataset.idx)));
    });
    document.querySelectorAll(".print-btn").forEach(btn => {
        btn.addEventListener("click", (e) => showReceipt(bookings[e.target.dataset.idx]));
    });
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (confirm("Delete this booking?")) {
                bookings.splice(e.target.dataset.idx, 1);
                localStorage.setItem("carWashBookings", JSON.stringify(bookings));
                loadBookings();
            }
        });
    });
}

// ✏️ EDIT BOOKING
function editBooking(idx) {
    const bookings = JSON.parse(localStorage.getItem("carWashBookings") || "[]");
    const bk = bookings[idx];

    document.getElementById("editIndex").value = idx;
    document.getElementById("formTitle").textContent = "✏️ Edit Booking";
    document.getElementById("referenceId").value = bk.id;
    document.getElementById("ownerName").value = bk.ownerName;
    document.getElementById("bookingDate").value = bk.bookingDate;
    document.getElementById("startTime").value = bk.startTime;
    document.getElementById("endTime").value = bk.endTime;
    document.getElementById("vehicleDetails").value = bk.vehicleDetails;
    document.getElementById("totalAmount").value = bk.totalAmount;

    // Select service
    const opts = document.getElementById("serviceType").options;
    for (let i = 0; i < opts.length; i++) {
        if (opts[i].value === bk.serviceType) {
            opts[i].selected = true;
            break;
        }
    }

    // Select payment status
    document.getElementById("paymentStatus").value = bk.paymentStatus;
    // Select status radio
    document.querySelector(`input[name="serviceStatus"][value="${bk.serviceStatus}"]`).checked = true;

    // Show cancel button
    document.getElementById("cancelEdit").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ❌ CANCEL EDIT
function cancelEdit() {
    document.getElementById("editIndex").value = "";
    document.getElementById("formTitle").textContent = "Service Scheduling & Booking";
    document.getElementById("cancelEdit").style.display = "none";
    document.getElementById("bookingForm").reset();
    setTodayDate();
}

// ⚙️ SETTINGS — Manage Services
function openSettings() {
    document.getElementById("settingsModal").style.display = "block";
    renderServiceList();
}

function closeSettings() {
    document.getElementById("settingsModal").style.display = "none";
    clearServiceForm();
    loadServicesToDropdown(); // Refresh dropdown
}

function renderServiceList() {
    const list = document.getElementById("serviceList");
    const services = getServices();
    list.innerHTML = "<h3>📋 Current Services</h3>";

    services.forEach((svc, idx) => {
        list.innerHTML += `
            <div class="service-item">
                <div class="info"><strong>${svc.name}</strong> — ${svc.minutes} mins — ₱${svc.price}</div>
                <div>
                    <button class="action-btn svc-btn edit-svc" data-idx="${idx}">✏️</button>
                    <button class="action-btn svc-btn delete-btn del-svc" data-idx="${idx}">🗑️</button>
                </div>
            </div>
        `;
    });

    // Attach events
    document.querySelectorAll(".edit-svc").forEach(btn => {
        btn.addEventListener("click", (e) => editService(parseInt(e.target.dataset.idx)));
    });
    document.querySelectorAll(".del-svc").forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (confirm("Delete this service?")) {
                const s = getServices();
                s.splice(parseInt(e.target.dataset.idx), 1);
                localStorage.setItem("carWashServices", JSON.stringify(s));
                renderServiceList();
            }
        });
    });
}

function editService(idx) {
    const svc = getServices()[idx];
    document.getElementById("svcName").value = svc.name;
    document.getElementById("svcMins").value = svc.minutes;
    document.getElementById("svcPrice").value = svc.price;
    document.getElementById("svcEditIndex").value = idx;
}

function saveService() {
    const name = document.getElementById("svcName").value.trim();
    const mins = parseInt(document.getElementById("svcMins").value);
    const price = parseFloat(document.getElementById("svcPrice").value);
    const editIdx = document.getElementById("svcEditIndex").value;

    if (!name || !mins || !price) {
        alert("⚠️ Fill up all fields!");
        return;
    }

    let services = getServices();
    if (editIdx !== "") {
        services[editIdx] = { name, minutes: mins, price };
        alert("✅ Service Updated!");
    } else {
        services.push({ name, minutes: mins, price });
        alert("✅ New Service Added!");
    }

    localStorage.setItem("carWashServices", JSON.stringify(services));
    clearServiceForm();
    renderServiceList();
}

function clearServiceForm() {
    document.getElementById("svcName").value = "";
    document.getElementById("svcMins").value = "";
    document.getElementById("svcPrice").value = "";
    document.getElementById("svcEditIndex").value = "";
}

// 🧾 SHOW & PRINT RECEIPT
function showReceipt(bk) {
    const date = new Date(bk.bookingDate).toLocaleDateString("en-PH", {
        year: "numeric", month: "long", day: "numeric"
    });

    document.getElementById("receiptBody").innerHTML = `
        <div class="receipt">
            <h3>🚗 CAR WASH RECEIPT</h3>
            <div class="row"><strong>Ref ID:</strong> <span>${bk.id}</span></div>
            <div class="row"><strong>Date:</strong> <span>${date}</span></div>
            <div class="row"><strong>Customer:</strong> <span>${bk.ownerName}</span></div>
            <div class="row"><strong>Vehicle:</strong> <span>${bk.vehicleDetails}</span></div>
            <hr>
            <div class="row"><strong>Service:</strong> <span>${bk.serviceType.split(" — ")[0]}</span></div>
            <div class="row"><strong>Start Time:</strong> <span>${bk.startTime}</span></div>
            <div class="row"><strong>Est. End:</strong> <span>${bk.endTime}</span></div>
            <hr>
            <div class="row total"><strong>TOTAL:</strong> <span>₱${bk.totalAmount}</span></div>
            <div class="row"><strong>Payment:</strong> <span>${bk.paymentStatus}</span></div>
            <div class="row"><strong>Status:</strong> <span>${bk.serviceStatus}</span></div>
            <div class="thankyou">Thank you! Come again! 😊</div>
        </div>
    `;
    document.getElementById("receiptModal").style.display = "block";
}

function printReceipt() {
    window.print();
}

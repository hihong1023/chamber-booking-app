// ✅ Teams-style Notification Function
function showTeamsNotification(message, type = "info", duration = 2800) {
    const n = document.getElementById('teamsNotification');
    const icon = document.getElementById('teamsNotificationIcon');
    const msg = document.getElementById('teamsNotificationMessage');

    // Choose color/icon
    let bg = "#25262b", ic = "";
    switch (type) {
        case "success": bg = "#228B22"; ic = "✔️"; break;
        case "error":   bg = "#bb2c2c"; ic = "❌"; break;
        case "warning": bg = "#f0ad4e"; ic = "⚠️"; break;
        default:        bg = "#25262b"; ic = "ℹ️";
    }
    n.style.background = bg;
    icon.textContent = ic;
    msg.textContent = message;
    n.style.display = 'block';
    n.style.opacity = 0.98;

    clearTimeout(n._timeout);
    n._timeout = setTimeout(() => {
        n.style.opacity = 0;
        setTimeout(() => { n.style.display = 'none'; }, 400);
    }, duration);

    n.onclick = () => {
        n.style.opacity = 0;
        setTimeout(() => { n.style.display = 'none'; }, 400);
    };
}

let currentDate = new Date();
let holidays = [];
let isDragging = false;      // Still defined, but not used.
let selectedCells = [];      // Still defined, but not used.
let allBookings = [];
let editingBooking = null; // Track edit mode

const apiBaseUrl = "/api/BookingApi";

const colorPalette = [
    { color: "#4caf50", name: "Green" },   // default
    { color: "#2196f3", name: "Blue" },
    { color: "#ff9800", name: "Orange" },
    { color: "#ab47bc", name: "Purple" },
    { color: "#e53935", name: "Red" },
    { color: "#757575", name: "Gray" }
];

// ✅ Open "Add Booking" popup
document.getElementById('addBookingBtn').addEventListener('click', () => {
    openManualBookingPopup();
});

// ✅ Open "View/Edit Bookings" popup
document.getElementById('viewBookingsBtn').addEventListener('click', () => {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('viewBookings').style.display = 'block';
    displayAllBookings();
});

// ✅ Refresh button
document.getElementById('refreshBtn').addEventListener('click', () => {
    fetchAndRenderBookings();
});

function formatDate(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

function dateOnly(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function formatDatetime(dt) {
    if (!dt) return "";
    const date = new Date(dt);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDatetimeLocal(dt) {
    if (!dt) return "";
    const date = new Date(dt);
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function updateMonthHeader() {
    document.getElementById('currentMonth').textContent =
        `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;
}

// ✅ Close popups
function closeManualPopup() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('manualPopup').style.display = 'none';
    editingBooking = null;
}
function closeViewBookings() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('viewBookings').style.display = 'none';
}
function closeConfirm() {
    document.getElementById('confirmBox').style.display = 'none';
}

// ✅ Month navigation
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateMonthHeader();
    fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateMonthHeader();
    fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);
});
document.getElementById('monthSelect').addEventListener('change', (e) => {
    const [year, month] = e.target.value.split('-');
    currentDate = new Date(year, month - 1);
    updateMonthHeader();
    fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);
});

function renderColorOptions(selectedColor) {
    const colorOptions = document.getElementById('colorOptions');
    colorOptions.innerHTML = '';
    colorPalette.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.title = opt.name;
        btn.style.cssText = `
            display:inline-block;
            width:28px;height:28px;
            border-radius:50%;
            border:2px solid ${selectedColor === opt.color ? "#222" : "#fff"};
            background:${opt.color};
            margin-right:7px;cursor:pointer;outline:none;
        `;
        if (selectedColor === opt.color) {
            btn.innerHTML = "✓";
            btn.style.color = "#fff";
            btn.style.fontWeight = "bold";
            btn.style.fontSize = "1rem";
            btn.style.textAlign = "center";
        }
        btn.addEventListener('click', () => {
            document.getElementById('manualColor').value = opt.color;
            renderColorOptions(opt.color);
        });
        colorOptions.appendChild(btn);
    });
}

function setupBookingTimeRadioEvents() {
    document.querySelectorAll('input[name="bookingTimeType"]').forEach(rb => {
        rb.addEventListener('change', function() {
            const startField = document.getElementById('manualStart');
            const endField = document.getElementById('manualEnd');
            const startDate = (startField.value || '').split("T")[0];
            const endDate = (endField.value || '').split("T")[0] || startDate;
            if(this.value === 'office') {
                startField.value = startDate + "T09:00";
                endField.value = endDate + "T18:00";
            } else if(this.value === 'off') {
                startField.value = startDate + "T18:00";
                // End date + 1 for overnight
                let endObj = new Date(startDate + "T18:00");
                endObj.setDate(endObj.getDate() + 1);
                let pad = n => String(n).padStart(2, '0');
                let eDateStr = `${endObj.getFullYear()}-${pad(endObj.getMonth()+1)}-${pad(endObj.getDate())}`;
                endField.value = eDateStr + "T09:00";
            } else if(this.value === 'all') {
                startField.value = startDate + "T00:00";
                endField.value = endDate + "T23:59";
            }
        });
    });
}

// ✅ Fetch public holidays
function fetchHolidays(year) {
    return fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/SG`)
        .then(res => res.json())
        .then(data => {
            holidays = data.map(h => ({ date: h.date, name: h.localName }));
        }).catch(err => {
            console.error("Failed to fetch holidays:", err);
            holidays = [];
            showTeamsNotification("Could not load public holidays.", "warning");
        });
}

// ✅ Fetch and render bookings
function fetchAndRenderBookings() {
    return fetch(apiBaseUrl, { method: "GET" })
        .then(res => {
            if (!res.ok) throw new Error(`API GET failed: ${res.status}`);
            return res.json();
        })
        .then(data => {
            allBookings = data || [];
            renderCalendar();
            displayAllBookings();
        })
        .catch(err => {
            console.error("Failed to fetch bookings:", err);
            showTeamsNotification("Error loading bookings. See console for details.", "error");
            allBookings = [];
            renderCalendar();
            displayAllBookings();
        });
}

// ✅ Render calendar
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    updateMonthHeader();

    const monthSelect = document.getElementById('monthSelect');
    monthSelect.innerHTML = '';
    for (let y = year - 1; y <= year + 1; y++) {
        for (let m = 0; m < 12; m++) {
            const option = document.createElement('option');
            option.value = `${y}-${m + 1}`;
            option.text = `${new Date(y, m).toLocaleString('default', { month: 'long' })} ${y}`;
            if (y === year && m === month) option.selected = true;
            monthSelect.appendChild(option);
        }
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    let endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    let weekNum = 1;

    while (startDate <= endDate) {
        let table = document.createElement('table');
        let dayRow = document.createElement('tr');
        let weekTitle = document.createElement('th');
        weekTitle.className = 'week-title';
        weekTitle.innerHTML = `Week ${weekNum}: ${formatDate(startDate)} – ${formatDate(new Date(startDate.getTime() + 6 * 86400000))}`;
        dayRow.appendChild(weekTitle);

        for (let i = 0; i < 7; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            const th = document.createElement('th');
            const dateISO = formatDate(day);
            const holiday = holidays.find(h => h.date === dateISO);
            if (holiday) {
                th.className = 'holiday-header';
            } else if (day.getDay() === 0 || day.getDay() === 6) {
                th.className = 'weekend-header';
            } else {
                th.className = 'day-header';
            }
            th.innerHTML = `${day.toLocaleString('default', { weekday: 'short' })}<br>${day.getDate()}${holiday ? `<br><small>${holiday.name}</small>` : ''}`;
            dayRow.appendChild(th);
        }
        table.appendChild(dayRow);

        for (let chamber = 1; chamber <= 3; chamber++) {
            let row = document.createElement('tr');
            row.innerHTML = `<td class="chamber-name">Chamber ${chamber}</td>`;
            for (let i = 0; i < 7; i++) {
                let cell = document.createElement('td');
                let cellDate = new Date(startDate.getTime() + i * 86400000);
                cell.dataset.date = formatDate(cellDate);
                cell.dataset.chamber = chamber;
                cell.className = '';

                // Drag-to-booking is disabled. To re-enable, uncomment below:
                // cell.addEventListener('mousedown', () => startSelection(cell));
                // cell.addEventListener('mouseover', () => selectCell(cell));
                // cell.addEventListener('mouseup', endSelection);

                row.appendChild(cell); // <-- THIS IS CRUCIAL!
            }
            table.appendChild(row);
        }
        calendar.appendChild(table);
        startDate.setDate(startDate.getDate() + 7);
        weekNum++;
    }
    // Clear all booking styles/content before re-applying
    document.querySelectorAll('td[data-chamber]').forEach(cell => {
        cell.classList.remove('booking');
        cell.style.backgroundColor = '';
        cell.innerHTML = '';
    });
    

    applyBookingToCalendar_All();
}

function applyBookingToCalendar_All() {
    for (let chamber = 1; chamber <= 3; chamber++) {
        document.querySelectorAll(`td[data-chamber='${chamber}']`).forEach(cell => {
            const cellDateStr = dateOnly(cell.dataset.date);
            // Find bookings that include this cell (by date)
            const cellBookings = allBookings.filter(b =>
                String(b.chamber) === String(chamber) &&
                dateOnly(b.start) <= cellDateStr &&
                dateOnly(b.end) >= cellDateStr
            );

            // Sort bookings by actual start time
            cellBookings.sort((a, b) => new Date(a.start) - new Date(b.start));

            if (cellBookings.length) {
                cell.classList.add('booking');
                cell.innerHTML = '';
                // Split cell horizontally
                cell.style.display = "flex";
                cell.style.flexDirection = "row";
                cell.style.padding = "0";
                cell.style.minHeight = "48px";

                let widthPct = Math.floor(100 / cellBookings.length);

                cellBookings.forEach((b, idx) => {
                    const div = document.createElement('div');
                    div.style.background = b.color || "#4caf50";
                    div.style.flex = `1 1 0`;
                    div.style.display = "flex";
                    div.style.flexDirection = "column";
                    div.style.justifyContent = "center";
                    div.style.alignItems = "center";
                    div.style.fontSize = "0.93em";
                    div.style.color = "#fff";
                    div.style.borderRight = (idx < cellBookings.length - 1) ? "2px solid #fff" : "none";
                    div.style.minWidth = "0";
                    div.style.overflow = "hidden";
                    div.style.padding = "2px 2px";

                    // Show time only for first/last day
                    let timeLabel = "";
                    if (cellDateStr === dateOnly(b.start)) {
                        timeLabel = `from ${new Date(b.start).toTimeString().slice(0,5)}`;
                    } else if (cellDateStr === dateOnly(b.end)) {
                        timeLabel = `till ${new Date(b.end).toTimeString().slice(0,5)}`;
                    } else {
                        timeLabel = "09:00-18:00";
                    }

                    div.innerHTML = `
                        <span style="font-weight:bold;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">${b.project}</span>
                        <small>${b.pic || ""}</small>
                        <small style="font-size:0.8em">${timeLabel}</small>
                    `;
                    cell.appendChild(div);
                });
            } else {
                cell.classList.remove('booking');
                cell.style.background = '';
                cell.style.display = '';
                cell.innerHTML = '';
            }
        });
    }
}





// ✅ Holiday Check Utility
function hasHolidayInRange(start, end) {
    return holidays.some(h => {
        const hDate = new Date(h.date);
        return hDate >= new Date(start) && hDate <= new Date(end);
    });
}

// ✅ Open manual booking popup for Add/Edit
function openManualBookingPopup(booking = null) {
    closeViewBookings();
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('manualPopup').style.display = 'block';

    if (booking) {
        document.getElementById('manualChamber').value = booking.chamber;
        document.getElementById('manualStart').value = toDatetimeLocal(booking.start);
        document.getElementById('manualEnd').value = toDatetimeLocal(booking.end);
        document.getElementById('manualProject').value = booking.project;
        document.getElementById('manualPic').value = booking.pic;
        document.getElementById('manualColor').value = booking.color;
        renderColorOptions(booking.color || "#4caf50");
        editingBooking = booking;
    } else {
        document.getElementById('manualChamber').value = "1";
        // Default: today 09:00–18:00
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        document.getElementById('manualStart').value = `${dateStr}T09:00`;
        document.getElementById('manualEnd').value = `${dateStr}T18:00`;
        document.getElementById('manualProject').value = "";
        document.getElementById('manualPic').value = "";
        document.getElementById('manualColor').value = "#4caf50";
        renderColorOptions("#4caf50");
        editingBooking = null;
        setupBookingTimeRadioEvents();
    }
}


function saveManualBooking() {
    const booking = {
        chamber: document.getElementById('manualChamber').value,
        start: document.getElementById('manualStart').value,
        end: document.getElementById('manualEnd').value,
        project: document.getElementById('manualProject').value,
        pic: document.getElementById('manualPic').value,
        color: document.getElementById('manualColor').value
    };

    if (new Date(booking.start) > new Date(booking.end)) {
        showTeamsNotification("Start date/time cannot be after end date/time.", "error");
        return;
    }

    // 🟢 Overlap check BEFORE saving/confirming
    if (!isBookingValid(booking, editingBooking ? editingBooking.rowKey : null)) {
        showTeamsNotification("Booking overlaps with another booking for this chamber.", "error");
        return;
    }

    if (hasHolidayInRange(booking.start, booking.end)) {
        showConfirm("Your booking includes public holidays. Continue?", () => processSaveBooking(booking));
    } else {
        processSaveBooking(booking);
    }
}




async function processSaveBooking(booking) {
    // If editing and the "key" (start date/chamber) is changed, do DELETE + POST.
    if (editingBooking &&
        (booking.start !== editingBooking.start || booking.chamber !== editingBooking.chamber)) {
        try {
            // 1. Delete old booking by rowKey
            await fetch(`${apiBaseUrl}?rowKey=${editingBooking.rowKey}`, { method: "DELETE" });

            // 2. Create new booking
            let res = await fetch(apiBaseUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(booking)
            });
            if (!res.ok) throw new Error("Failed to save booking after key change.");
            
            closeManualPopup();
            fetchAndRenderBookings();
            showTeamsNotification("Booking updated!", "success");
        } catch (err) {
            showTeamsNotification("Error updating booking: " + err.message, "error");
        }
        return;
    }

    // Normal update
    if (editingBooking) {
        booking.rowKey = editingBooking.rowKey;
        try {
            let res = await fetch(`${apiBaseUrl}?rowKey=${booking.rowKey}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(booking)
            });
            if (!res.ok) throw new Error("Failed to update booking.");
            closeManualPopup();
            fetchAndRenderBookings();
            showTeamsNotification("Booking updated!", "success");
        } catch (err) {
            showTeamsNotification("Error saving/updating booking: " + err.message, "error");
        }
    } else {
        // New booking
        try {
            let res = await fetch(apiBaseUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(booking)
            });
            if (!res.ok) throw new Error("Failed to save booking.");
            closeManualPopup();
            fetchAndRenderBookings();
            showTeamsNotification("Booking saved!", "success");
        } catch (err) {
            showTeamsNotification("Error saving/updating booking: " + err.message, "error");
        }
    }
}


function isBookingValid(newBooking, ignoreRowKey = null) {
    const newStart = new Date(newBooking.start);
    const newEnd = new Date(newBooking.end);

    return !allBookings.some(existing => {
        if (ignoreRowKey && existing.rowKey === ignoreRowKey) return false;
        if (String(existing.chamber) !== String(newBooking.chamber)) return false;

        const existingStart = new Date(existing.start);
        const existingEnd = new Date(existing.end);

        // Allow edge-to-edge booking without overlap
        return !(
            newEnd <= existingStart || newStart >= existingEnd
        );
    });
}



// ✅ Custom confirm box
function showConfirm(message, onConfirm) {
    const confirmBox = document.getElementById('confirmBox');
    document.getElementById('confirmMessage').textContent = message;
    confirmBox.style.display = 'block';

    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    // Remove old listeners to avoid duplicates
    yesBtn.replaceWith(yesBtn.cloneNode(true));
    noBtn.replaceWith(noBtn.cloneNode(true));

    document.getElementById('confirmYes').addEventListener('click', () => {
        confirmBox.style.display = 'none';
        onConfirm();
    });
    document.getElementById('confirmNo').addEventListener('click', () => {
        confirmBox.style.display = 'none';
    });
}

// ✅ View/Edit Bookings logic
function displayAllBookings() {
    const listDiv = document.getElementById('bookingsList');
    listDiv.innerHTML = ''; // Clear previous content

    for (let chamber = 1; chamber <= 3; chamber++) {
        const section = document.createElement('div');
        section.className = 'chamber-section';
        section.innerHTML = `<h4>Chamber ${chamber}</h4>`;

        const chamberBookings = allBookings
            .filter(b => String(b.chamber) == String(chamber))
            .sort((a, b) => new Date(a.start) - new Date(b.start));

        if (chamberBookings.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'no-bookings';
            emptyMsg.textContent = "No bookings for this chamber.";
            section.appendChild(emptyMsg);
        } else {
            chamberBookings.forEach((b, idx) => {
                const item = document.createElement('div');
                item.className = 'booking-item';
                item.innerHTML =
                    `<div class="top-row">
                        <span class="name"></span>
                        <span class="pic"></span>
                    </div>
                    <div class="bottom-row">
                        <span class="date"></span>
                        <div class="booking-actions">
                            <button class="edit-btn">Edit</button>
                            <button class="delete-btn">Delete</button>
                        </div>
                    </div>`;

                item.querySelector('.name').textContent = b.project;
                item.querySelector('.pic').textContent = b.pic;
                item.querySelector('.date').textContent = 
                    `${formatDatetime(b.start)} to ${formatDatetime(b.end)}`;



                // 📝 Edit button
                item.querySelector('.edit-btn').addEventListener('click', () => {
                    openManualBookingPopup(b);
                });

                // 🗑️ Delete button
                item.querySelector('.delete-btn').addEventListener('click', () => {
                    showConfirm(`Delete booking for "${b.project}"?`, async () => {
                        await fetch(`${apiBaseUrl}?rowKey=${b.rowKey}`, { method: "DELETE" });
                        closeViewBookings();
                        fetchAndRenderBookings();
                        showTeamsNotification("Booking deleted.", "success");
                    });
                });

                section.appendChild(item);
            });
        }
        listDiv.appendChild(section);
    }
}

// 🚀 On page load
fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);

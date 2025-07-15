let currentDate = new Date();
let holidays = [];
let allBookings = [];
let editingBooking = null; // Track edit mode

const apiBaseUrl = "/api/BookingApi";

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

// ✅ Fetch public holidays
function fetchHolidays(year) {
    return fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/SG`)
        .then(res => res.json())
        .then(data => {
            holidays = data.map(h => ({ date: h.date, name: h.localName }));
        }).catch(err => {
            console.error("Failed to fetch holidays:", err);
            holidays = [];
        });
}

// ✅ Fetch and render bookings
function fetchAndRenderBookings() {
    fetch(apiBaseUrl, { method: "GET" })
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
            showPopup("❌ Error loading bookings. Please try again.");
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
                th.className = 'weekend-header'; // Grey out Sat/Sun
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
                row.appendChild(cell);
            }
            table.appendChild(row);
        }
        calendar.appendChild(table);
        startDate.setDate(startDate.getDate() + 7);
        weekNum++;
    }
    allBookings.forEach(b => applyBookingToCalendar(b));
}

function applyBookingToCalendar(booking) {
    let startDate = new Date(booking.start);
    let endDate = new Date(booking.end);
    document.querySelectorAll(`td[data-chamber='${booking.chamber}']`).forEach(cell => {
        const cellDate = new Date(cell.dataset.date);
        if (cellDate >= startDate && cellDate <= endDate) {
            cell.classList.add('booking');
            cell.style.backgroundColor = booking.color || '#4caf50';
            cell.innerHTML = `${booking.project}<br><small>${booking.pic}</small>`;
        }
    });
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
        document.getElementById('manualStart').value = booking.start;
        document.getElementById('manualEnd').value = booking.end;
        document.getElementById('manualProject').value = booking.project;
        document.getElementById('manualPic').value = booking.pic;
        document.getElementById('manualColor').value = booking.color;
        editingBooking = booking;
    } else {
        document.getElementById('manualChamber').value = "1";
        document.getElementById('manualStart').value = "";
        document.getElementById('manualEnd').value = "";
        document.getElementById('manualProject').value = "";
        document.getElementById('manualPic').value = "";
        document.getElementById('manualColor').value = "#4caf50";
        editingBooking = null;
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

    if (hasHolidayInRange(booking.start, booking.end)) {
        showPopup("⚠️ Your booking includes public holidays. Continue?", () => processSaveBooking(booking));
    } else {
        processSaveBooking(booking);
    }
}

function processSaveBooking(booking) {
    if (!isBookingValid(booking, editingBooking ? editingBooking.rowKey : null)) {
        showPopup("❌ Booking overlaps with another booking.");
        return;
    }

    if (editingBooking) {
        booking.rowKey = editingBooking.rowKey;
        fetch(`${apiBaseUrl}?rowKey=${booking.rowKey}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(booking)
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to update booking.");
            return res.json();
        })
        .then(() => {
            closeManualPopup();
            fetchAndRenderBookings();
        })
        .catch(err => showPopup("❌ Error updating booking."));
    } else {
        fetch(apiBaseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(booking)
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to save booking.");
            return res.json();
        })
        .then(() => {
            closeManualPopup();
            fetchAndRenderBookings();
        })
        .catch(err => showPopup("❌ Error saving booking."));
    }
}

// ✅ Validate booking (prevent clashes)
function isBookingValid(newBooking, ignoreRowKey = null) {
    const newStart = new Date(newBooking.start);
    const newEnd = new Date(newBooking.end);

    return !allBookings.some(existing => {
        if (ignoreRowKey && existing.rowKey === ignoreRowKey) return false;
        if (existing.chamber !== newBooking.chamber) return false;

        const existingStart = new Date(existing.start);
        const existingEnd = new Date(existing.end);

        return (newStart <= existingEnd && newEnd >= existingStart);
    });
}

// ✅ Teams-friendly popup
function showPopup(message, onConfirm = null) {
    const confirmBox = document.getElementById('confirmBox');
    document.getElementById('confirmMessage').textContent = message;
    confirmBox.style.display = 'block';

    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    yesBtn.replaceWith(yesBtn.cloneNode(true));
    noBtn.replaceWith(noBtn.cloneNode(true));

    document.getElementById('confirmYes').addEventListener('click', () => {
        confirmBox.style.display = 'none';
        if (onConfirm) onConfirm();
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

        const chamberBookings = allBookings.filter(b => b.chamber == chamber);

        if (chamberBookings.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'no-bookings';
            emptyMsg.textContent = "No bookings for this chamber.";
            section.appendChild(emptyMsg);
        } else {
            chamberBookings.forEach(b => {
                const item = document.createElement('div');
                item.className = 'booking-item';
                item.innerHTML = `
                    <div class="top-row">
                        <span class="name">${b.project}</span>
                        <span class="pic">${b.pic}</span>
                    </div>
                    <div class="bottom-row">
                        <span class="date">${b.start} to ${b.end}</span>
                        <div class="booking-actions">
                            <button class="edit-btn">Edit</button>
                            <button class="delete-btn">Delete</button>
                        </div>
                    </div>`;

                // 📝 Edit button
                item.querySelector('.edit-btn').addEventListener('click', () => {
                    openManualBookingPopup(b);
                });

                // 🗑️ Delete button
                item.querySelector('.delete-btn').addEventListener('click', () => {
                    showPopup(`Delete booking for "${b.project}"?`, () => {
                        fetch(`${apiBaseUrl}?rowKey=${b.rowKey}`, { method: "DELETE" })
                            .then(() => fetchAndRenderBookings())
                            .catch(err => showPopup("❌ Error deleting booking."));
                        closeViewBookings();
                    });
                });

                section.appendChild(item);
            });
        }
        listDiv.appendChild(section);
    }
}

// ✅ Update month header text
function updateMonthHeader() {
    document.getElementById('currentMonth').textContent =
        `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;
}

// ✅ Format date as YYYY-MM-DD
function formatDate(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

// ✅ Teams-friendly popup (confirm modal)
function showPopup(message, onConfirm = null) {
    const confirmBox = document.getElementById('confirmBox');
    document.getElementById('confirmMessage').textContent = message;
    confirmBox.style.display = 'block';

    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    // Clean old listeners
    yesBtn.replaceWith(yesBtn.cloneNode(true));
    noBtn.replaceWith(noBtn.cloneNode(true));

    // Attach new listeners
    document.getElementById('confirmYes').addEventListener('click', () => {
        confirmBox.style.display = 'none';
        if (onConfirm) onConfirm();
    });
    document.getElementById('confirmNo').addEventListener('click', () => {
        confirmBox.style.display = 'none';
    });
}

// ✅ Initial page load
fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);


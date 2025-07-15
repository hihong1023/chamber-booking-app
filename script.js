let currentDate = new Date();
let holidays = [];
let isDragging = false;
let selectedCells = [];
let allBookings = [];

// ✅ API base URL
const apiBaseUrl = "/api/BookingApi"

// 🎯 Open "Add Booking" popup
document.getElementById('addBookingBtn').addEventListener('click', () => {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('manualPopup').style.display = 'block';
});

// 🎯 Open "View/Edit Bookings" popup
document.getElementById('viewBookingsBtn').addEventListener('click', () => {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('viewBookings').style.display = 'block';
    displayAllBookings();
});

// 🎯 Close popups
function closeManualPopup() {F
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('manualPopup').style.display = 'none';
}
function closeViewBookings() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('viewBookings').style.display = 'none';
}
function closePopup() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('popup').style.display = 'none';
    clearSelection();
}

// 🎯 Month navigation
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);
});
document.getElementById('monthSelect').addEventListener('change', (e) => {
    const [year, month] = e.target.value.split('-');
    currentDate = new Date(year, month - 1);
    fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);
});

// 🎯 Fetch public holidays
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

// 🎯 Fetch and render bookings
function fetchAndRenderBookings() {
    fetch(apiBaseUrl, {
        method: "GET"
    })
    .then(res => {
        if (!res.ok) throw new Error(`API GET failed: ${res.status}`);
        return res.json();
    })
    .then(data => {
        allBookings = data || [];
        renderCalendar();
    })
    .catch(err => {
        console.error("Failed to fetch bookings:", err);
        alert("Error loading bookings. See console for details.");
        allBookings = [];
        renderCalendar();
    });
}

// 🎯 Render calendar
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

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
                th.className = 'weekend-header'; // 🆕 grey weekend header
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
                cell.addEventListener('mousedown', () => startSelection(cell));
                cell.addEventListener('mouseover', () => selectCell(cell));
                cell.addEventListener('mouseup', endSelection);
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

// 🎯 Display all bookings in popup
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
            chamberBookings.forEach((b, idx) => {
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
                            <button onclick="editBooking(allBookings[${idx}])">Edit</button>
                            <button onclick="deleteBooking(${idx})">Delete</button>
                        </div>
                    </div>`;
                section.appendChild(item);
            });
        }
        listDiv.appendChild(section);
    }
}

// 🎯 Save booking
function saveManualBooking() {
    const booking = {
        chamber: document.getElementById('manualChamber').value,
        start: document.getElementById('manualStart').value,
        end: document.getElementById('manualEnd').value,
        project: document.getElementById('manualProject').value,
        pic: document.getElementById('manualPic').value,
        color: document.getElementById('manualColor').value
    };

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
    .catch(err => alert("Error saving booking: " + err.message));
}

// 🎯 Delete booking
function deleteBooking(index) {
    const booking = allBookings[index];
    if (confirm("Are you sure you want to delete this booking?")) {
        fetch(`${apiBaseUrl}?rowKey=${booking.rowKey}`, {
            method: "DELETE"
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to delete booking.");
            return res.json();
        })
        .then(() => {
            allBookings.splice(index, 1);
            renderCalendar();
            displayAllBookings();
        })
        .catch(err => alert("Error deleting booking: " + err.message));
    }
}

// 🎯 Drag to select cells
function startSelection(cell) {
    isDragging = true;
    clearSelection();
    selectCell(cell);
    document.addEventListener('mouseup', endSelection);
}
function selectCell(cell) {
    if (isDragging) {
        if (cell.classList.contains('booking')) {
            cell.classList.add('deleting'); // 🔴 Highlight booked cells in red
        } else {
            cell.classList.add('selecting');
        }
        selectedCells.push(cell);
    }
}

function endSelection() {
    isDragging = false;
    document.removeEventListener('mouseup', endSelection);

    if (selectedCells.length === 0) return;

    const hasBookings = selectedCells.some(cell => cell.classList.contains('booking'));

    if (hasBookings) {
        if (confirm("Do you want to delete all selected bookings?")) {
            const bookingsToDelete = [];

            selectedCells.forEach(cell => {
                const booking = allBookings.find(
                    b =>
                        b.chamber === cell.dataset.chamber &&
                        new Date(b.start) <= new Date(cell.dataset.date) &&
                        new Date(b.end) >= new Date(cell.dataset.date)
                );
                if (booking && !bookingsToDelete.some(b => b.rowKey === booking.rowKey)) {
                    bookingsToDelete.push(booking);
                }
            });

            Promise.all(
                bookingsToDelete.map(b =>
                    fetch(`${apiBaseUrl}?rowKey=${b.rowKey}`, { method: "DELETE" })
                        .then(res => {
                            if (!res.ok) throw new Error(`Failed to delete booking ${b.project}`);
                        })
                )
            )
                .then(() => {
                    alert("Selected bookings deleted successfully.");
                    fetchAndRenderBookings();
                })
                .catch(err => alert("Error deleting one or more bookings: " + err.message));
        }
        clearSelection();
        return;
    }

    const hasHoliday = selectedCells.some(cell => holidays.find(h => h.date === cell.dataset.date));
    if (hasHoliday && !confirm("Your booking includes public holidays. Continue?")) {
        clearSelection();
        return;
    }

    // No bookings in selected cells, open normal booking popup
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('popup').style.display = 'block';
}

// 🎯 Save booking from drag popup
function saveBooking() {
    const booking = {
        chamber: selectedCells[0].dataset.chamber,
        start: selectedCells[0].dataset.date,
        end: selectedCells[selectedCells.length - 1].dataset.date,
        project: document.getElementById('projectName').value,
        pic: document.getElementById('pic').value,
        color: document.getElementById('color').value
    };

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
        closePopup();
        fetchAndRenderBookings();
    })
    .catch(err => alert("Error saving booking: " + err.message));
}

function clearSelection() {
    selectedCells.forEach(cell => {
        cell.classList.remove('selecting');
        cell.classList.remove('deleting');
    });
    selectedCells = [];
}
// 🎯 Teams-friendly confirmation
function showConfirm(message, onConfirm) {
    const confirmBox = document.getElementById('confirmBox');
    document.getElementById('confirmMessage').textContent = message;
    confirmBox.style.display = 'block';

    document.getElementById('confirmYes').onclick = function () {
        confirmBox.style.display = 'none';
        onConfirm();
    }
    document.getElementById('confirmNo').onclick = function () {
        confirmBox.style.display = 'none';
    }
}

// 🆕 Update Month Header
function updateMonthHeader() {
    document.getElementById('currentMonth').textContent =
        `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;
}

// 🎯 Singapore-safe date format (YYYY-MM-DD)
function formatDate(date) {
    return date.getFullYear() + '-' +
           String(date.getMonth() + 1).padStart(2, '0') + '-' +
           String(date.getDate()).padStart(2, '0');
}

// 🚀 On page load
fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);

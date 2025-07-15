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
function closeManualPopup() {
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
        weekTitle.innerHTML = `Week ${weekNum}: ${startDate.toLocaleDateString()} – ${new Date(startDate.getTime() + 6 * 86400000).toLocaleDateString()}`;
        dayRow.appendChild(weekTitle);

        for (let i = 0; i < 7; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            const th = document.createElement('th');
            const dateISO = day.toISOString().split('T')[0];
            const holiday = holidays.find(h => h.date === dateISO);
            th.className = holiday ? 'holiday-header' : 'day-header';
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
                cell.dataset.date = cellDate.toISOString().split('T')[0];
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

// 🎯 Display all bookings in popup
function displayAllBookings() {
    const listDiv = document.getElementById('bookingsList');
    listDiv.innerHTML = '';

    if (allBookings.length === 0) {
        listDiv.innerHTML = "<p>No bookings found.</p>";
        return;
    }

    allBookings.forEach((b, index) => {
        const div = document.createElement('div');
        div.className = "booking-item";
        div.innerHTML = `
            <strong>${b.project}</strong><br>
            Chamber: ${b.chamber}<br>
            ${b.start} → ${b.end}<br>
            PIC: ${b.pic}<br>
            <button onclick="deleteBooking(${index})">Delete</button>
        `;
        listDiv.appendChild(div);
    });
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
    if (confirm("Delete this booking?")) {
        fetch(`${apiBaseUrl}?rowKey=${encodeURIComponent(booking.rowKey)}`, {
            method: "DELETE"
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to delete booking.");
            fetchAndRenderBookings();
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
    if (isDragging && !cell.classList.contains('booking')) {
        cell.classList.add('selecting');
        selectedCells.push(cell);
    }
}
function endSelection() {
    isDragging = false;
    document.removeEventListener('mouseup', endSelection);
    if (selectedCells.length > 0) {
        const conflict = selectedCells.some(cell => cell.classList.contains('booking'));
        if (conflict) {
            alert("Cannot book: one or more selected dates are already booked.");
            clearSelection();
            return;
        }
        const hasHoliday = selectedCells.some(cell => holidays.find(h => h.date === cell.dataset.date));
        if (hasHoliday && !confirm("Your booking includes public holidays. Continue?")) {
            clearSelection();
            return;
        }
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('popup').style.display = 'block';
    }
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
    selectedCells.forEach(cell => cell.classList.remove('selecting'));
    selectedCells = [];
}

// 🚀 On page load
fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);

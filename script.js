let currentDate = new Date();
let holidays = [];
let isDragging = false;
let selectedCells = [];
let allBookings = [];

// ✅ Your Azure Function API URL
const apiBaseUrl = "https://chamber-booking-api-acckatb7dmbwc2gu.eastasia-01.azurewebsites.net/api/BookingApi?"; // replace with your real function URL

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

function fetchHolidays(year) {
    return fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/SG`)
        .then(res => res.json())
        .then(data => {
            holidays = data.map(h => ({ date: h.date, name: h.localName }));
        }).catch(err => {
            console.error("Failed to fetch holidays", err);
            holidays = [];
        });
}

function fetchAndRenderBookings() {
    // 🛠 Fetch all bookings from API
    fetch(apiBaseUrl)
        .then(res => res.json())
        .then(data => {
            allBookings = data || []; // If no bookings, set empty array
            renderCalendar();
        })
        .catch(err => {
            console.error("Failed to fetch bookings from API:", err);
            allBookings = [];
            renderCalendar();
        });
}

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
            if (holiday) {
                th.className = 'holiday-header';
                th.innerHTML = `${day.toLocaleString('default', { weekday: 'short' })}<br>${day.getDate()}<br><small>${holiday.name}</small>`;
            } else {
                th.className = 'day-header';
                th.innerHTML = `${day.toLocaleString('default', { weekday: 'short' })}<br>${day.getDate()}`;
            }
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

function saveManualBooking() {
    const booking = {
        chamber: document.getElementById('manualChamber').value,
        start: document.getElementById('manualStart').value,
        end: document.getElementById('manualEnd').value,
        project: document.getElementById('manualProject').value,
        pic: document.getElementById('manualPic').value,
        color: document.getElementById('manualColor').value
    };

    // POST booking to API
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

function deleteBooking(index) {
    const booking = allBookings[index];
    if (confirm("Delete this booking?")) {
        fetch(`${apiBaseUrl}?chamber=${booking.chamber}&start=${booking.start}`, {
            method: "DELETE"
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to delete booking.");
            fetchAndRenderBookings();
        })
        .catch(err => alert("Error deleting booking: " + err.message));
    }
}

function applyBookingToCalendar(booking) {
    let startDate = new Date(booking.start);
    let endDate = new Date(booking.end);
    document.querySelectorAll(`td[data-chamber='${booking.chamber}']`).forEach(cell => {
        const cellDate = new Date(cell.dataset.date);
        if (cellDate >= startDate && cellDate <= endDate) {
            cell.classList.add('booking');
            cell.style.backgroundColor = booking.color;
            cell.innerHTML = `${booking.project}<br><small>${booking.pic}</small>`;
        }
    });
}

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
function saveBooking() {
    const booking = {
        chamber: selectedCells[0].dataset.chamber,
        start: selectedCells[0].dataset.date,
        end: selectedCells[selectedCells.length - 1].dataset.date,
        project: document.getElementById('projectName').value,
        pic: document.getElementById('pic').value,
        color: document.getElementById('color').value
    };

    // POST booking to API
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
function closePopup() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('popup').style.display = 'none';
    clearSelection();
}
function clearSelection() {
    selectedCells.forEach(cell => cell.classList.remove('selecting'));
    selectedCells = [];
}

// 🚀 Fetch bookings and holidays on page load
fetchHolidays(currentDate.getFullYear()).then(fetchAndRenderBookings);

let currentDate = new Date();
let holidays = [];
let isDragging = false;
let selectedCells = [];
let allBookings = [];

/* All JS logic (same as your previous <script> code) */
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    fetchHolidays(currentDate.getFullYear()).then(renderCalendar);
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    fetchHolidays(currentDate.getFullYear()).then(renderCalendar);
});
document.getElementById('monthSelect').addEventListener('change', (e) => {
    const [year, month] = e.target.value.split('-');
    currentDate = new Date(year, month - 1);
    fetchHolidays(currentDate.getFullYear()).then(renderCalendar);
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

function openManualPopup() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('manualPopup').style.display = 'block';
}
function closeManualPopup() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('manualPopup').style.display = 'none';
}
function openViewBookings() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('viewBookings').style.display = 'block';
    displayAllBookings();
}
function closeViewBookings() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('viewBookings').style.display = 'none';
}
function displayAllBookings() {
    const listDiv = document.getElementById('bookingsList');
    listDiv.innerHTML = '';
    [1, 2, 3].forEach(chamber => {
        const section = document.createElement('div');
        section.className = 'chamber-section';
        section.innerHTML = `<h4>Chamber ${chamber}</h4>`;
        allBookings.filter(b => b.chamber == chamber).forEach((b, idx) => {
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
        listDiv.appendChild(section);
    });
}
function editBooking(booking) {
    document.getElementById('manualChamber').value = booking.chamber;
    document.getElementById('manualStart').value = booking.start;
    document.getElementById('manualEnd').value = booking.end;
    document.getElementById('manualProject').value = booking.project;
    document.getElementById('manualPic').value = booking.pic;
    document.getElementById('manualColor').value = booking.color;
    closeViewBookings();
    openManualPopup();
    allBookings = allBookings.filter(b => b !== booking);
}
function deleteBooking(index) {
    if (confirm("Delete this booking?")) {
        allBookings.splice(index, 1);
        renderCalendar();
        displayAllBookings();
    }
}
function saveManualBooking() {
    const chamber = document.getElementById('manualChamber').value;
    const start = document.getElementById('manualStart').value;
    const end = document.getElementById('manualEnd').value;
    const project = document.getElementById('manualProject').value;
    const pic = document.getElementById('manualPic').value;
    const color = document.getElementById('manualColor').value;
    if (!start || !end || !project || !pic) {
        alert("Please fill all fields.");
        return;
    }
    let startDate = new Date(start);
    let endDate = new Date(end);
    let conflict = false;
    document.querySelectorAll(`td[data-chamber='${chamber}']`).forEach(cell => {
        const cellDate = new Date(cell.dataset.date);
        if (cellDate >= startDate && cellDate <= endDate && cell.classList.contains('booking')) conflict = true;
    });
    if (conflict) {
        alert("Cannot book: dates conflict with existing booking.");
        return;
    }
    const booking = { chamber, start, end, project, pic, color };
    allBookings.push(booking);
    applyBookingToCalendar(booking);
    closeManualPopup();
    renderCalendar();
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
            cell.onclick = () => {
                if (confirm("Delete this booking?")) {
                    allBookings = allBookings.filter(b => !(b.chamber === booking.chamber && b.start === booking.start && b.end === booking.end && b.project === booking.project));
                    renderCalendar();
                }
            };
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
    const project = document.getElementById('projectName').value;
    const pic = document.getElementById('pic').value;
    const color = document.getElementById('color').value;

    if (!project || !pic) {
        alert("Please fill in project name and PIC.");
        return;
    }

    const chamber = selectedCells[0].dataset.chamber;
    const start = selectedCells[0].dataset.date;
    const end = selectedCells[selectedCells.length - 1].dataset.date;
    const booking = { chamber, start, end, project, pic, color };
    allBookings.push(booking);

    renderCalendar();
    closePopup();
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
fetchHolidays(currentDate.getFullYear()).then(renderCalendar);

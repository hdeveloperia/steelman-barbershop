// --- Navigation ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

let bookingData = {
    service: '',
    date: '',
    time: '',
    name: '',
    phone: ''
};

// URL for Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMq_vRAQzaIyWbIkdks_NbJcQlRQ75bu73Q5KZARaiDlK33GaN1wVd5WirLk7VbAVW/exec';

// --- Google Calendar Sync ---
async function syncToGoogleCalendar(booking) {
    if (!GOOGLE_SCRIPT_URL) return;

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        console.log('Syncing with Google Calendar...');
    } catch (e) {
        console.error('Error syncing calendar:', e);
    }
}

// Sticky header and Section Fusion logic
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('header-scrolled');
    } else {
        header.classList.remove('header-scrolled');
    }

    const hero = document.querySelector('.hero');
    if (hero) {
        const scrollPos = window.scrollY;
        const heroHeight = hero.offsetHeight;
        const fadeStart = heroHeight * 0.3;
        let opacity = 1 - (scrollPos - fadeStart) / (heroHeight * 0.6);
        opacity = Math.max(0, Math.min(1, opacity));
        hero.style.opacity = opacity;
    }
});


// --- Availability System ---
let busySlots = [];
const morningTimes = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];
const afternoonTimes = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
const allPossibleTimes = [...morningTimes, ...afternoonTimes];

async function fetchAvailability() {
    renderDayTabs();
    if (GOOGLE_SCRIPT_URL) {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'GET',
                cache: 'no-cache'
            });
            busySlots = await response.json();
            console.log("Citas ocupadas recibidas de Google:", busySlots); // Debug log
            renderAvailability(0);
        } catch (e) {
            console.error('Error fetching availability:', e);
            renderAvailability(0);
        }
    } else {
        renderAvailability(0);
    }
}

function renderDayTabs() {
    const tabsContainer = document.getElementById('availability-tabs');
    tabsContainer.innerHTML = '';
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const btn = document.createElement('button');
        btn.className = `tab-btn ${i === 0 ? 'active' : ''}`;
        const dayName = i === 0 ? 'Hoy' : (i === 1 ? 'Mañ' : days[date.getDay()]);
        const dayNum = date.getDate();
        btn.innerHTML = `${dayName} ${dayNum}`;
        btn.onclick = (e) => changeAvailabilityDay(i, e.target);
        tabsContainer.appendChild(btn);
    }
}

function changeAvailabilityDay(dayIndex, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAvailability(dayIndex);
}

function renderAvailability(dayOffset) {
    const grid = document.getElementById('availability-grid');
    grid.innerHTML = '';
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    allPossibleTimes.forEach(time => {
        const isBusy = checkSlotBusy(targetDate, time);
        const card = createSlotCard(time, isBusy, dayOffset);
        grid.appendChild(card);
    });
}

function createSlotCard(time, isBusy, dayOffset) {
    const div = document.createElement('div');
    div.className = `slot-card ${isBusy ? 'busy' : 'available'}`;
    div.innerHTML = `
        <span class="slot-time">${time}</span>
        <span class="slot-status">${isBusy ? 'Ocupado' : 'Libre'}</span>
    `;
    if (!isBusy) {
        div.onclick = () => openBookingModal(dayOffset, time);
    }
    return div;
}

function checkSlotBusy(date, time) {
    const [hours, minutes] = time.split(':');
    const slotStart = new Date(date.getTime());
    slotStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const slotTimeAbs = Math.floor(slotStart.getTime() / 60000); // Minutos totales

    return busySlots.some(busy => {
        const start = Math.floor(new Date(busy.start).getTime() / 60000);
        const end = Math.floor(new Date(busy.end).getTime() / 60000);
        
        return (slotTimeAbs >= start && slotTimeAbs < end);
    });
}

// --- Modal Functions ---
const bookingModal = document.getElementById('booking-modal');
let selectedSlot = { date: '', time: '' };

function openBookingModal(dayOffset, time) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    selectedSlot.date = i18n_date(dayOffset);
    selectedSlot.time = time;
    document.getElementById('modal-date-time').innerText = `${dateStr} a las ${time}`;
    bookingModal.style.display = 'block';
}

function i18n_date(offset) {
    if(offset === 0) return 'Hoy';
    if(offset === 1) return 'Mañana';
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return names[d.getDay()] + ' próximo';
}

function closeBookingModal() {
    bookingModal.style.display = 'none';
}

window.onclick = (event) => {
    if (event.target == bookingModal) closeBookingModal();
};

async function confirmAppointment() {
    const service = document.getElementById('modal-service').value;
    const name = document.getElementById('modal-name').value.trim();
    const phone = document.getElementById('modal-phone').value.trim();
    const email = document.getElementById('modal-email').value.trim();
    const termsAccepted = document.getElementById('modal-terms').checked;

    if (!name || !phone || !email) {
        alert('Por favor, rellena todos los campos de contacto.');
        return;
    }

    if (!termsAccepted) {
        alert('Debes aceptar los términos y el envío de comunicaciones legales para continuar.');
        return;
    }

    const booking = { 
        service, 
        date: selectedSlot.date, 
        time: selectedSlot.time, 
        name, 
        phone, 
        email, 
        marketing: "Aceptado",
        id: Date.now() 
    };
    syncToGoogleCalendar(booking);
    alert(`¡Reserva confirmada! Te esperamos el ${booking.date} a las ${booking.time}.`);
    closeBookingModal();
    fetchAvailability();
}

// Initial fetch
fetchAvailability();


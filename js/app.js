//------------------------------------------
// Google Apps Script
//------------------------------------------

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz51JzrK7JAEnMbdJKIfxt1dZO3YUPHqwz2VEyagj1qBho6XUV3rrPcso7zgLYFb08_/exec";
// ⚠️ ตอนนี้ WEB_APP_URL ยังใช้อยู่สำหรับ: ตั้งค่า, Google Calendar, อีเมล, LINE, รูปผลงาน
// (จะย้ายส่วนที่เหลือมาที่ Supabase ในเฟสถัดไป)

//------------------------------------------
// Supabase (ฐานข้อมูลหลักของคิว/ลูกค้า)
//------------------------------------------

const SUPABASE_URL = "https://aykanrfeacypeblkivsm.supabase.co";
const SUPABASE_KEY = "sb_publishable_XVWpfawH790WULQTQwVUvw_IDrU8Emw";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// เก็บโปรไฟล์ (username/role) ของผู้ใช้ที่ล็อคอินอยู่ตอนนี้ - เซ็ตหลังล็อคอินสำเร็จ
let currentUserProfile = null;

// แปลงข้อมูลจาก Supabase (คอลัมน์ภาษาอังกฤษ) ให้กลายเป็นรูปแบบเดิมที่ทั้งแอปใช้อยู่
// (คีย์ภาษาไทย เช่น customer["ชื่อ"]) เพื่อไม่ต้องแก้โค้ดส่วนแสดงผลทั้งหมดที่มีอยู่แล้ว
function mapRowToBooking(row){

    return {

        "ID": row.id,
        "ชื่อ": row.customer_name,
        "เบอร์โทร": row.phone,
        "Line/IG": row.contact,
        "วันที่นัด": row.booking_date,
        "เวลานัด": row.booking_time,
        "ราคา": row.price,
        "มัดจำ": row.deposit,
        "สถานะ": row.status,
        "รายละเอียด": row.detail,
        "Event ID": row.calendar_event_id,
        "โน้ต": row.note,
        "วันที่เสร็จสิ้น": row.completed_date,
        "รูปผลงาน": row.photos,
        "ส่วนลดพิเศษ%": row.special_discount_percent,
        "ส่วนลดพิเศษบาท": row.special_discount_amount

    };

}

// แปลงข้อมูลจากฟอร์ม (คีย์แบบเดิมที่โค้ดส่งมา เช่น data.name, data.phone)
// ให้กลายเป็นชื่อคอลัมน์ภาษาอังกฤษที่ตาราง Supabase ใช้จริง
function mapBookingToRow(data){

    const row = {};

    if(data.name !== undefined) row.customer_name = data.name;
    if(data.phone !== undefined) row.phone = data.phone;
    if(data.contact !== undefined) row.contact = data.contact;
    if(data.date !== undefined) row.booking_date = data.date;
    if(data.time !== undefined) row.booking_time = data.time;
    if(data.price !== undefined) row.price = data.price === "" ? null : Number(data.price);
    if(data.deposit !== undefined) row.deposit = data.deposit === "" ? null : Number(data.deposit);
    if(data.status !== undefined) row.status = data.status;
    if(data.detail !== undefined) row.detail = data.detail;
    if(data.note !== undefined) row.note = data.note;

    return row;

}

//------------------------------------------
// รูปที่เลือกไว้ในฟอร์ม "เพิ่มคิว" ก่อนกดบันทึก
//------------------------------------------

let pendingBookingPhotos = [];

function genBookingId(){

    if(window.crypto && crypto.randomUUID){

        return crypto.randomUUID();

    }

    // สำรองไว้เผื่อเบราว์เซอร์เก่าไม่รองรับ crypto.randomUUID
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);

}
//------------------------------------------
// วันที่ / เวลา Real-time
//------------------------------------------

const currentDate = document.getElementById("currentDate");
const currentTime = document.getElementById("currentTime");

function updateDateTime(){

    const now = new Date();

    const dayNames = [
        "อาทิตย์",
        "จันทร์",
        "อังคาร",
        "พุธ",
        "พฤหัสบดี",
        "ศุกร์",
        "เสาร์"
    ];

    const monthNames = [
        "ม.ค.",
        "ก.พ.",
        "มี.ค.",
        "เม.ย.",
        "พ.ค.",
        "มิ.ย.",
        "ก.ค.",
        "ส.ค.",
        "ก.ย.",
        "ต.ค.",
        "พ.ย.",
        "ธ.ค."
    ];

    currentDate.innerHTML =
        `${dayNames[now.getDay()]} ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()+543}`;

    currentTime.innerHTML =
        now.toLocaleTimeString("th-TH");

}

updateDateTime();

setInterval(updateDateTime,1000);


//------------------------------------------
// Toast Popup แจ้งเตือน (แทน alert)
//------------------------------------------

let toastContainer = document.getElementById("toastContainer");

if(!toastContainer){

    toastContainer = document.createElement("div");

    toastContainer.id = "toastContainer";

    toastContainer.className = "toast-container";

    document.body.appendChild(toastContainer);

}

function showToast(message, type = "info"){

    const icons = {

        success: "fa-circle-check",
        error: "fa-circle-xmark",
        warning: "fa-triangle-exclamation",
        info: "fa-circle-info"

    };

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;

    toast.innerHTML = `

        <i class="fa-solid ${icons[type] || icons.info} toast-icon"></i>

        <span class="toast-message">${message}</span>

        <button class="toast-close" type="button">
            <i class="fa-solid fa-xmark"></i>
        </button>

    `;

    toastContainer.appendChild(toast);

    requestAnimationFrame(()=> toast.classList.add("show"));

    function removeToast(){

        toast.classList.remove("show");

        toast.classList.add("hide");

        setTimeout(()=> toast.remove(), 250);

    }

    toast.querySelector(".toast-close").addEventListener("click", removeToast);

    setTimeout(removeToast, 3500);

}

//------------------------------------------
// เวลานัดที่เปิดให้จอง (ใช้ร่วมกันทุกฟอร์ม)
//------------------------------------------

const TIME_SLOTS = [
    "13:00","15:00","19:00","21:00"
];

function getTimeOptionsHTML(){

    let html = `<option value="">-- เลือกเวลานัด --</option>`;

    TIME_SLOTS.forEach(t=>{

        html += `<option value="${t}">${t}</option>`;

    });

    return html;

}

const STATUS_OPTIONS = ["ยังไม่มัดจำ","มัดจำแล้ว","ชำระทั้งหมด","เสร็จสิ้น","ยกเลิก"];

function getStatusOptionsHTML(selected){

    return STATUS_OPTIONS.map(s=>

        `<option ${s === selected ? "selected" : ""}>${s}</option>`

    ).join("");

}

// สถานะสำหรับตอนสร้าง/เพิ่มคิวใหม่ - เน้นสถานะการชำระเงินเท่านั้น
// (ยังไม่ถึงจุดที่จะ "เสร็จสิ้น" หรือ "ยกเลิก" ตั้งแต่ตอนสร้าง)
const BOOKING_STATUS_OPTIONS = ["ยังไม่มัดจำ","มัดจำแล้ว","ชำระทั้งหมด"];

function getBookingStatusOptionsHTML(selected){

    return BOOKING_STATUS_OPTIONS.map(s=>

        `<option ${s === selected ? "selected" : ""}>${s}</option>`

    ).join("");

}

// สถานะแบบเปลี่ยนไวจาก Dashboard - เน้นแค่ "เสร็จสิ้น" / "ยกเลิก"
// แต่ถ้าสถานะปัจจุบันยังเป็นสถานะการชำระเงินอยู่ (ยังไม่ถึงวันนัด) จะโชว์ค่าปัจจุบันไว้ด้วย
// เพื่อไม่ให้ dropdown แสดงค่าผิดเพี้ยนไปจากที่บันทึกจริง
function getQuickStatusOptionsHTML(current){

    const quickOptions = ["เสร็จสิ้น","ยกเลิก"];

    const options = quickOptions.includes(current)
        ? quickOptions
        : [current, ...quickOptions];

    return options.map(s=>

        `<option ${s === current ? "selected" : ""}>${s}</option>`

    ).join("");

}

//------------------------------------------
// Element
//------------------------------------------

const menus = document.querySelectorAll(".menu");

const pageTitle = document.getElementById("pageTitle");

const pageSubtitle = document.getElementById("pageSubtitle");

const pageContent = document.getElementById("pageContent");

let editingCustomer = null;

//------------------------------------------
// เก็บ Dashboard เดิม
//------------------------------------------

const dashboardHTML = pageContent.innerHTML;


//------------------------------------------
// Menu Click
//------------------------------------------

function navigateToPage(page, extra){

    menus.forEach(item=>item.classList.remove("active"));

    const targetMenu = document.querySelector(`.menu[data-page="${page}"]`);

    if(targetMenu) targetMenu.classList.add("active");

    switch(page){

        case "dashboard":

            showDashboard();

            break;

        case "booking":

            showBooking();

            break;

        case "customer":

            showCustomer(extra);

            break;

        case "calendar":

            showCalendar();

            break;

        case "paymentTracker":

            showPaymentTracker();

            break;

        case "reports":

            showReports();

            break;

        case "settings":

            if(!currentUserProfile || currentUserProfile.role !== "owner"){

                showToast("คุณไม่มีสิทธิ์เข้าหน้านี้", "warning");

                return;

            }

            showSettings();

            break;

    }

}

menus.forEach(menu=>{

    menu.addEventListener("click",function(e){

        e.preventDefault();

        if(this.id === "logoutMenuBtn"){

            logoutUser();

            return;

        }

        navigateToPage(this.dataset.page);

    });

});

//------------------------------------------
// ระบบล็อคอิน (Supabase Auth) - เช็คสิทธิ์ + ออกจากระบบ
//------------------------------------------

async function loadCurrentUserProfile(userId){

    try{

        const { data, error } = await supabaseClient

            .from("profiles")

            .select("id, username, role")

            .eq("id", userId)

            .single();

        if(error) throw error;

        currentUserProfile = data;

    }catch(error){

        console.error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ:", error);

        currentUserProfile = null;

    }

}

function applyRoleRestrictions(){

    if(!currentUserProfile) return;

    const settingsMenuItem = document.getElementById("settingsMenuItem");

    if(settingsMenuItem){

        settingsMenuItem.style.display = currentUserProfile.role === "owner" ? "" : "none";

    }

    displayCurrentUserInHeader();

}

// โชว์ชื่อบัญชี + สิทธิ์ที่ล็อคอินอยู่ ไว้ตรงหัว Dashboard (ในการ์ดวันที่/เวลา)
function displayCurrentUserInHeader(){

    if(!currentUserProfile) return;

    const row = document.getElementById("currentUserRow");
    const label = document.getElementById("currentUserLabel");
    const badge = document.getElementById("currentUserRoleBadge");

    if(!row || !label || !badge) return;

    label.textContent = currentUserProfile.username;

    badge.textContent = currentUserProfile.role === "owner" ? "เจ้าของร้าน" : "แอดมิน";

    badge.className = "role-badge role-" + currentUserProfile.role;

    row.style.display = "flex";

}

async function logoutUser(){

    await supabaseClient.auth.signOut();

    window.location.href = "login.html";

}
//------------------------------------------
// Dashboard
//------------------------------------------

let dashboardCountdownInterval = null;

let dashboardCountdownTarget = null;

function showDashboard(){

    pageTitle.innerHTML = "Dashboard";

    pageSubtitle.innerHTML = "ระบบจัดการคิวลูกค้า";

    pageContent.innerHTML = dashboardHTML;

    const container = document.getElementById("dashboardContainer");

    container.innerHTML = `
        <div class="loading-card">

            <i class="fa-solid fa-spinner fa-spin"></i>

            <h3>กำลังโหลดข้อมูล...</h3>

            <p>กำลังดึงคิวจาก Google Sheets</p>

        </div>
    `;

    refreshDashboard();

}

//------------------------------------------
// Booking
//------------------------------------------

function showBooking(){
pageTitle.innerHTML = "เพิ่มคิว";

pageSubtitle.innerHTML = "กรอกข้อมูลการจองคิวลูกค้า";

pageContent.innerHTML = `

<div class="booking-card">

    <div class="booking-header">

        <h2>

            <i class="fa-solid fa-calendar-plus"></i>

            เพิ่มคิวลูกค้า

        </h2>

        <p>

            กรอกข้อมูลลูกค้าให้ครบถ้วน

        </p>

    </div>

    <form id="bookingForm" class="booking-form">

        <div class="form-section-label full-width">
            <i class="fa-solid fa-user"></i> ข้อมูลลูกค้า
        </div>

        <div class="form-group">

            <label>ชื่อ-นามสกุล *</label>

            <input
                id="customerName"
                type="text"
                placeholder="ชื่อ-นามสกุล">

        </div>

        <div class="form-group">

            <label>เบอร์โทร *</label>

            <input
                id="customerPhone"
                type="tel"
                placeholder="08xxxxxxxx"
                maxlength="10"
                inputmode="numeric">

        </div>

        <div class="form-group full-width">

            <label>LINE / IG</label>

            <input
                id="customerContact"
                type="text"
                placeholder="@username">

        </div>

        <div class="form-section-label full-width">
            <i class="fa-solid fa-calendar-days"></i> รายละเอียดนัดหมาย
        </div>

        <div class="form-group">

            <label>วันที่นัด *</label>

            <input
                id="bookingDate"
                type="date">

        </div>

        <div class="form-group">

    <label>เวลานัด *</label>

    <select id="bookingTime">${getTimeOptionsHTML()}</select>

</div>

        <div class="form-group full-width">

            <label>รายละเอียดงาน</label>

            <textarea
                id="bookingDetail"
                placeholder="รายละเอียดงานสัก / ขนาด / ตำแหน่ง / หมายเหตุ"></textarea>

        </div>

        <div class="form-section-label full-width">
            <i class="fa-solid fa-note-sticky"></i> โน้ตส่วนตัว
        </div>

        <div class="form-group full-width">

            <label>โน้ตเกี่ยวกับลูกค้า</label>

            <textarea
                id="customerNote"
                placeholder="เช่น แพ้อะไร ชอบสไตล์ไหน นัดยาก/ง่าย ฯลฯ (ไม่บังคับ)"></textarea>

        </div>

        <div class="form-section-label full-width">
            <i class="fa-solid fa-images"></i> รูปผลงาน / ภาพอ้างอิง
        </div>

        <div class="form-group full-width">

            <label>แนบรูป (เลือกได้หลายรูป)</label>

            <div class="photo-picker-preview" id="bookingPhotoPreview"></div>

            <label class="photo-upload-btn">

                <i class="fa-solid fa-camera"></i>
                เลือกรูป

                <input type="file" id="bookingPhotoInput" accept="image/*" multiple style="display:none;">

            </label>

        </div>

        <div class="form-section-label full-width">
            <i class="fa-solid fa-sack-dollar"></i> การเงิน
        </div>

        <div class="form-group">

            <label>ราคาประเมิน (บาท)</label>

            <input
                id="bookingPrice"
                type="number"
                placeholder="0">

        </div>

        <div class="form-group">

            <label>มัดจำ (บาท)</label>

            <input
                id="bookingDeposit"
                type="number"
                placeholder="0">

        </div>

        <div class="form-group full-width">

            <label>สถานะการชำระ</label>

            <select id="bookingStatus">${getBookingStatusOptionsHTML("ยังไม่มัดจำ")}</select>

        </div>

        <div class="form-group full-width">

            <button
                type="submit"
                class="save-btn">

                <i class="fa-solid fa-floppy-disk"></i>

                บันทึกข้อมูล

            </button>

        </div>

    </form>

</div>

`;

    pendingBookingPhotos = [];

    renderBookingPhotoPreview();

    document.getElementById("bookingPhotoInput").addEventListener("change", function(e){

        Array.from(e.target.files).forEach(file => pendingBookingPhotos.push(file));

        renderBookingPhotoPreview();

        e.target.value = "";

    });

}


//------------------------------------------
// Customer
//------------------------------------------

function showCustomer(initialSearch){

    pageTitle.innerHTML = "ลูกค้า";

    pageSubtitle.innerHTML = "รายชื่อลูกค้าทั้งหมด";

    const searchValue = initialSearch ? String(initialSearch).replace(/"/g,'&quot;') : "";

    pageContent.innerHTML = `

    <div class="booking-card">

        <div class="booking-header">

            <h2>

                <i class="fa-solid fa-users"></i>

                ลูกค้า

            </h2>

            <div class="search-box">

                <i class="fa-solid fa-magnifying-glass"></i>

                <input
                    type="text"
                    id="searchCustomer"
                    placeholder="ค้นหาชื่อ เบอร์โทร หรือ Line/IG"
                    value="${searchValue}">

            </div>

        </div>

        <div id="customerList"></div>

    </div>

    `;
loadCustomer(initialSearch);

}




//------------------------------------------
// Calendar
//------------------------------------------

let calendarViewDate = new Date();

function showCalendar(){

    pageTitle.innerHTML = "ตารางคิว";

    pageSubtitle.innerHTML = "ปฏิทินนัดหมายทั้งหมด";

    calendarViewDate = new Date();

    calendarViewDate.setDate(1);

    pageContent.innerHTML = `

        <div class="booking-card calendar-card">

            <div class="calendar-header">

                <button class="calendar-nav-btn" id="calendarPrevBtn">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>

                <h2 id="calendarMonthLabel"></h2>

                <button class="calendar-nav-btn" id="calendarNextBtn">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>

            </div>

            <div class="calendar-weekdays">

                <span>อา</span>
                <span>จ</span>
                <span>อ</span>
                <span>พ</span>
                <span>พฤ</span>
                <span>ศ</span>
                <span>ส</span>

            </div>

            <div class="calendar-grid" id="calendarGrid">

                <div class="loading-card">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>กำลังโหลดข้อมูล...</h3>
                </div>

            </div>

        </div>

    `;

    document.getElementById("calendarPrevBtn").addEventListener("click", function(){

        calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);

        renderCalendar();

    });

    document.getElementById("calendarNextBtn").addEventListener("click", function(){

        calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);

        renderCalendar();

    });

    renderCalendar();

}

async function renderCalendar(){

    const bookings = await loadBookings();

    const grid = document.getElementById("calendarGrid");

    if(!grid) return; // ผู้ใช้กดเปลี่ยนหน้าไปแล้วระหว่างโหลดข้อมูล

    const monthNames = [
        "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
        "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
    ];

    const year = calendarViewDate.getFullYear();

    const month = calendarViewDate.getMonth();

    document.getElementById("calendarMonthLabel").textContent =
        `${monthNames[month]} ${year + 543}`;

    //--------------------------------------
    // จัดกลุ่มคิวตามวันที่ (key = YYYY-MM-DD, ไม่รวมคิวที่ยกเลิก)
    //--------------------------------------

    const bookingsByDate = {};

    bookings.forEach(booking=>{

        if(booking["สถานะ"] === "ยกเลิก") return;

        const key = toDateInputValue(booking["วันที่นัด"]);

        if(!key) return;

        if(!bookingsByDate[key]) bookingsByDate[key] = [];

        bookingsByDate[key].push(booking);

    });

    window._calendarBookingsByDate = bookingsByDate;

    //--------------------------------------
    // สร้างช่องปฏิทิน
    //--------------------------------------

    const firstDayOfMonth = new Date(year, month, 1);

    const startWeekday = firstDayOfMonth.getDay(); // 0 = อาทิตย์

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const todayKey = toDateInputValue(new Date());

    let html = "";

    for(let i = 0; i < startWeekday; i++){

        html += `<div class="calendar-day empty"></div>`;

    }

    for(let day = 1; day <= daysInMonth; day++){

        const key = toDateInputValue(new Date(year, month, day));

        const dayBookings = bookingsByDate[key] || [];

        const isToday = key === todayKey;

        html += `

        <div
            class="calendar-day ${isToday ? "today" : ""} ${dayBookings.length ? "has-bookings" : ""}"
            ${dayBookings.length ? `onclick="openDayBookings('${key}')"` : ""}>

            <span class="calendar-day-number">${day}</span>

            ${dayBookings.length ? `<span class="calendar-day-badge">${dayBookings.length}</span>` : ``}

        </div>

        `;

    }

    grid.innerHTML = html;

}

function openDayBookings(dateKey){

    const bookings = (window._calendarBookingsByDate && window._calendarBookingsByDate[dateKey]) || [];

    bookings.sort((a,b)=> formatTime(a["เวลานัด"]).localeCompare(formatTime(b["เวลานัด"])));

    const oldPopup = document.getElementById("dayBookingsPopup");

    if(oldPopup) oldPopup.remove();

    const dateLabel = new Date(dateKey).toLocaleDateString("th-TH",{

        weekday:"long", day:"numeric", month:"long", year:"numeric"

    });

    let listHTML = "";

    bookings.forEach(booking=>{

        const customerJSON = JSON.stringify(booking).replace(/"/g,'&quot;');

        listHTML += `

        <div class="day-booking-item" onclick="viewCustomer(${customerJSON})">

            <div class="day-booking-time">

                <i class="fa-regular fa-clock"></i>
                ${formatTime(booking["เวลานัด"])}

            </div>

            <div class="day-booking-name">

                <i class="fa-solid fa-user"></i>
                ${booking["ชื่อ"]}

            </div>

        </div>

        `;

    });

    const popup = document.createElement("div");

    popup.id = "dayBookingsPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon">
                            <i class="fa-solid fa-calendar-day"></i>
                        </div>

                        <div>
                            <h2>คิววันนี้</h2>
                            <p id="dayBookingsDateLabel"></p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('dayBookingsPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body">

                    <div class="day-booking-list">

                        ${listHTML}

                    </div>

                </div>

                <div class="view-customer-footer">

                    <button
                        class="view-customer-close-btn"
                        onclick="document.getElementById('dayBookingsPopup').remove()">

                        ปิด

                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    document.getElementById("dayBookingsDateLabel").textContent = dateLabel;

}

//------------------------------------------
// ติดตามหนี้ (Payment Tracker)
//------------------------------------------

async function showPaymentTracker(){

    pageTitle.innerHTML = "ติดตามหนี้";

    pageSubtitle.innerHTML = "คิวที่ยังชำระเงินไม่ครบ";

    pageContent.innerHTML = `

        <div class="booking-card">

            <div class="booking-header">

                <h2>

                    <i class="fa-solid fa-hand-holding-dollar"></i>

                    ติดตามหนี้

                </h2>

                <p>

                    เรียงตามวันที่นัดใกล้สุดก่อน

                </p>

            </div>

            <div id="paymentTrackerList">

                <div class="loading-card">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>กำลังโหลดข้อมูล...</h3>
                </div>

            </div>

        </div>

    `;

    const bookings = await loadBookings();

    const container = document.getElementById("paymentTrackerList");

    if(!container) return; // ผู้ใช้เปลี่ยนหน้าไปแล้วระหว่างโหลด

    const pending = bookings

        .filter(b => b["สถานะ"] === "ยังไม่มัดจำ" || b["สถานะ"] === "มัดจำแล้ว")

        .sort((a,b)=> new Date(a["วันที่นัด"]) - new Date(b["วันที่นัด"]));

    if(pending.length === 0){

        container.innerHTML = `
            <div class="empty-card">
                <img src="images/Tiger4.png" alt="" class="empty-tiger">
                ไม่มีคิวที่ค้างชำระเงินอยู่เลย
            </div>
        `;

        return;

    }

    const totalOwed = pending.reduce((sum, b)=>{

        const price = Number(b["ราคา"]) || 0;

        const deposit = Number(b["มัดจำ"]) || 0;

        return sum + Math.max(price - deposit, 0);

    }, 0);

    let listHTML = `

        <div class="tracker-summary">

            ค้างเก็บทั้งหมด <strong>${pending.length} ราย</strong> รวม <strong>${totalOwed.toLocaleString("th-TH")} บาท</strong>

        </div>

    `;

    pending.forEach(booking=>{

        const bJSON = JSON.stringify(booking).replace(/"/g,'&quot;');

        const price = Number(booking["ราคา"]) || 0;

        const deposit = Number(booking["มัดจำ"]) || 0;

        const owed = Math.max(price - deposit, 0);

        listHTML += `

        <div class="tracker-item">

            <div class="tracker-item-main" onclick="viewCustomer(${bJSON})">

                <div class="tracker-item-name">

                    <i class="fa-solid fa-user"></i>
                    ${booking["ชื่อ"]}

                </div>

                <div class="tracker-item-date">

                    <i class="fa-regular fa-calendar"></i>
                    ${formatDate(booking["วันที่นัด"])} · ${formatTime(booking["เวลานัด"])} น.

                </div>

                <div class="tracker-item-owed">

                    ค้าง ${owed.toLocaleString("th-TH")} บาท

                </div>

            </div>

            <select
                class="queue-status-select tracker-status-select"
                onchange="updateBookingStatus('${booking["ID"]}', this.value, this, '${booking["Event ID"] || ""}')">

                ${getBookingStatusOptionsHTML(booking["สถานะ"])}

            </select>

        </div>

        `;

    });

    container.innerHTML = listHTML;

}

//------------------------------------------
// รายงานรายได้ (กราฟแท่ง รายวัน/รายเดือน/รายปี)
//------------------------------------------

let reportViewMode = "monthly";

let reportViewDate = new Date();

let discountReportViewMode = "monthly";

let discountReportViewDate = new Date();

async function showReports(){

    pageTitle.innerHTML = "รายงาน";

    pageSubtitle.innerHTML = "สรุปรายได้แบบกราฟ";

    reportViewMode = "monthly";

    reportViewDate = new Date();

    discountReportViewMode = "monthly";

    discountReportViewDate = new Date();

    pageContent.innerHTML = `

        <div class="booking-card">

            <div class="booking-header">

                <h2>

                    <i class="fa-solid fa-chart-column"></i>

                    รายงานรายได้

                </h2>

                <div class="report-tabs">

                    <button class="report-tab" data-mode="daily">รายวัน</button>

                    <button class="report-tab active" data-mode="monthly">รายเดือน</button>

                    <button class="report-tab" data-mode="yearly">รายปี</button>

                </div>

            </div>

            <div id="reportNav"></div>

            <div id="reportChartContainer">

                <div class="loading-card">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>กำลังโหลดข้อมูล...</h3>
                </div>

            </div>

        </div>

        <div class="booking-card" style="margin-top:24px;">

            <div class="booking-header">

                <h2>

                    <i class="fa-solid fa-ticket"></i>

                    รายงานส่วนลดรวม (คูปองสะสม + ส่วนลดพิเศษ)

                </h2>

                <div class="report-tabs">

                    <button class="discount-report-tab" data-mode="daily">รายวัน</button>

                    <button class="discount-report-tab active" data-mode="monthly">รายเดือน</button>

                    <button class="discount-report-tab" data-mode="yearly">รายปี</button>

                </div>

            </div>

            <div id="discountReportNav"></div>

            <div id="discountReportChartContainer">

                <div class="loading-card">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>กำลังโหลดข้อมูล...</h3>
                </div>

            </div>

        </div>

    `;

    document.querySelectorAll(".report-tab").forEach(tab=>{

        tab.addEventListener("click", function(){

            document.querySelectorAll(".report-tab").forEach(t=>t.classList.remove("active"));

            this.classList.add("active");

            reportViewMode = this.dataset.mode;

            reportViewDate = new Date();

            renderReport();

        });

    });

    document.querySelectorAll(".discount-report-tab").forEach(tab=>{

        tab.addEventListener("click", function(){

            document.querySelectorAll(".discount-report-tab").forEach(t=>t.classList.remove("active"));

            this.classList.add("active");

            discountReportViewMode = this.dataset.mode;

            discountReportViewDate = new Date();

            renderDiscountReport();

        });

    });

    renderReport();

    renderDiscountReport();

}

async function renderDiscountReport(){

    const container = document.getElementById("discountReportChartContainer");

    const navContainer = document.getElementById("discountReportNav");

    if(!container || !navContainer) return; // ผู้ใช้เปลี่ยนหน้าไปแล้วระหว่างโหลด

    let redemptions = [];

    try{

        const { data, error } = await supabaseClient

            .from("coupon_redemptions")

            .select("created_at, discount_amount");

        if(error) throw error;

        redemptions = data || [];

        // รวมส่วนลดพิเศษ (แยกจากคูปองสะสม) เข้ามาในรายงานเดียวกัน
        // ใช้รูปแบบข้อมูลเดียวกัน { created_at, discount_amount } เพื่อให้กราฟ/ยอดรวมด้านล่างใช้ต่อได้เลยโดยไม่ต้องแก้ logic คำนวณ
        const { data: specialRows, error: specialError } = await supabaseClient

            .from("bookings")

            .select("special_discount_applied_at, special_discount_amount")

            .not("special_discount_amount", "is", null);

        if(specialError) throw specialError;

        const specialAsRedemptions = (specialRows || [])

            .filter(r => r.special_discount_applied_at)

            .map(r => ({

                created_at: r.special_discount_applied_at,
                discount_amount: r.special_discount_amount

            }));

        redemptions = redemptions.concat(specialAsRedemptions);

    }catch(error){

        console.error(error);

        container.innerHTML = `<div class="empty-card">โหลดข้อมูลส่วนลดไม่สำเร็จ</div>`;

        return;

    }

    if(!document.getElementById("discountReportChartContainer")) return; // ผู้ใช้เปลี่ยนหน้าไปแล้ว

    if(discountReportViewMode === "daily"){

        renderDiscountDailyReport(redemptions, container, navContainer);

    }else if(discountReportViewMode === "yearly"){

        renderDiscountYearlyReport(redemptions, container, navContainer);

    }else{

        renderDiscountMonthlyReport(redemptions, container, navContainer);

    }

}

function renderDiscountDailyReport(redemptions, container, navContainer){

    const year = discountReportViewDate.getFullYear();

    const month = discountReportViewDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const discountByDay = new Array(daysInMonth + 1).fill(0);

    redemptions.forEach(r=>{

        const d = new Date(r.created_at);

        if(isNaN(d)) return;

        if(d.getFullYear() === year && d.getMonth() === month){

            discountByDay[d.getDate()] += Number(r.discount_amount) || 0;

        }

    });

    const dataPoints = [];

    for(let day = 1; day <= daysInMonth; day++){

        dataPoints.push({ label:String(day), value:discountByDay[day] });

    }

    const total = dataPoints.reduce((s,d)=>s + d.value, 0);


    navContainer.innerHTML = `

        <div class="report-nav-row">

            <button class="calendar-nav-btn" id="discountReportPrev"><i class="fa-solid fa-chevron-left"></i></button>

            <div class="report-nav-label">${REPORT_MONTH_NAMES[month]} ${year + 543}</div>

            <button class="calendar-nav-btn" id="discountReportNext"><i class="fa-solid fa-chevron-right"></i></button>

        </div>

        <div class="report-total">ส่วนลดรวมทั้งเดือน <strong>${total.toLocaleString("th-TH")} บาท</strong></div>

    `;

    document.getElementById("discountReportPrev").addEventListener("click", ()=>{

        discountReportViewDate.setMonth(discountReportViewDate.getMonth() - 1);

        renderDiscountReport();

    });

    document.getElementById("discountReportNext").addEventListener("click", ()=>{

        discountReportViewDate.setMonth(discountReportViewDate.getMonth() + 1);

        renderDiscountReport();

    });

    renderBarChart(container, dataPoints);

}

function renderDiscountMonthlyReport(redemptions, container, navContainer){

    const year = discountReportViewDate.getFullYear();

    const discountByMonth = new Array(12).fill(0);

    redemptions.forEach(r=>{

        const d = new Date(r.created_at);

        if(isNaN(d)) return;

        if(d.getFullYear() === year){

            discountByMonth[d.getMonth()] += Number(r.discount_amount) || 0;

        }

    });

    const dataPoints = REPORT_MONTH_SHORT.map((label,i)=>({ label, value:discountByMonth[i] }));

    const total = discountByMonth.reduce((s,v)=>s + v, 0);

    navContainer.innerHTML = `

        <div class="report-nav-row">

            <button class="calendar-nav-btn" id="discountReportPrev"><i class="fa-solid fa-chevron-left"></i></button>

            <div class="report-nav-label">ปี ${year + 543}</div>

            <button class="calendar-nav-btn" id="discountReportNext"><i class="fa-solid fa-chevron-right"></i></button>

        </div>

        <div class="report-total">ส่วนลดรวมทั้งปี <strong>${total.toLocaleString("th-TH")} บาท</strong></div>

    `;

    document.getElementById("discountReportPrev").addEventListener("click", ()=>{

        discountReportViewDate.setFullYear(discountReportViewDate.getFullYear() - 1);

        renderDiscountReport();

    });

    document.getElementById("discountReportNext").addEventListener("click", ()=>{

        discountReportViewDate.setFullYear(discountReportViewDate.getFullYear() + 1);

        renderDiscountReport();

    });

    renderBarChart(container, dataPoints);

}

function renderDiscountYearlyReport(redemptions, container, navContainer){

    const discountByYear = {};

    redemptions.forEach(r=>{

        const d = new Date(r.created_at);

        if(isNaN(d)) return;

        const y = d.getFullYear();

        discountByYear[y] = (discountByYear[y] || 0) + (Number(r.discount_amount) || 0);

    });

    const years = Object.keys(discountByYear).map(Number).sort((a,b)=>a - b);

    const total = years.reduce((s,y)=>s + discountByYear[y], 0);

    navContainer.innerHTML = `

        <div class="report-total">ส่วนลดรวมทุกปี <strong>${total.toLocaleString("th-TH")} บาท</strong></div>

    `;

    if(years.length === 0){

        container.innerHTML = `

            <div class="empty-card">
                <img src="images/Tiger4.png" alt="" class="empty-tiger">
                ยังไม่มีข้อมูลส่วนลด
            </div>

        `;

        return;

    }

    const dataPoints = years.map(y=>({ label:String(y + 543), value:discountByYear[y] }));

    renderBarChart(container, dataPoints);

}

async function renderReport(){

    const bookings = await loadBookings();

    const container = document.getElementById("reportChartContainer");

    const navContainer = document.getElementById("reportNav");

    if(!container || !navContainer) return; // ผู้ใช้เปลี่ยนหน้าไปแล้วระหว่างโหลด

    if(reportViewMode === "daily"){

        renderDailyReport(bookings, container, navContainer);

    }else if(reportViewMode === "yearly"){

        renderYearlyReport(bookings, container, navContainer);

    }else{

        renderMonthlyReport(bookings, container, navContainer);

    }

}

function formatChartValue(value, abbreviate){

    if(value <= 0) return "";

    if(!abbreviate) return value.toLocaleString("th-TH");

    if(value >= 1000){

        const thousands = value / 1000;

        // ตัดทศนิยมทิ้งถ้าลงตัว (6.0k -> 6k) ไม่งั้นโชว์ทศนิยม 1 ตำแหน่ง (6.5k)
        const rounded = Math.round(thousands * 10) / 10;

        return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + "k";

    }

    return String(value);

}

function renderBarChart(container, dataPoints){

    const max = Math.max(...dataPoints.map(d=>d.value), 1);

    // ถ้าแท่งเยอะเกินไป (เช่นมุมมองรายวัน) ตัวเลขเต็มจะแน่นจนทับกัน
    // เลยย่อเป็นแบบสั้น (6,000 -> 6k) แทน ยังเห็นตัวเลขได้เลยไม่ต้องเอาเมาส์ไปชี้
    const isCrowded = dataPoints.length > 15;

    let html = `<div class="report-chart">`;

    dataPoints.forEach(d=>{

        const heightPct = d.value > 0 ? Math.max((d.value / max) * 100, 4) : 0;

        const valueText = formatChartValue(d.value, isCrowded);

        const fullValueText = d.value > 0 ? d.value.toLocaleString("th-TH") : "0";

        html += `

        <div class="report-bar-col">

            <div class="report-bar-value${isCrowded ? " report-bar-value-compact" : ""}">${valueText}</div>

            <div class="report-bar" style="height:${heightPct}%" title="${d.label}: ${fullValueText} บาท"></div>

            <div class="report-bar-label">${d.label}</div>

        </div>

        `;

    });

    html += `</div>`;

    container.innerHTML = html;

}

const REPORT_MONTH_NAMES = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
];

const REPORT_MONTH_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

function renderDailyReport(bookings, container, navContainer){

    const year = reportViewDate.getFullYear();

    const month = reportViewDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const revenueByDay = new Array(daysInMonth + 1).fill(0);

    bookings.forEach(b=>{

        const d = new Date(b["วันที่นัด"]);

        if(isNaN(d)) return;

        if(d.getFullYear() === year && d.getMonth() === month){

            revenueByDay[d.getDate()] += calculateBookingRevenue(b);

        }

    });

    const dataPoints = [];

    for(let day = 1; day <= daysInMonth; day++){

        dataPoints.push({ label:String(day), value:revenueByDay[day] });

    }

    const total = dataPoints.reduce((s,d)=>s + d.value, 0);

    navContainer.innerHTML = `

        <div class="report-nav-row">

            <button class="calendar-nav-btn" id="reportPrev"><i class="fa-solid fa-chevron-left"></i></button>

            <div class="report-nav-label">${REPORT_MONTH_NAMES[month]} ${year + 543}</div>

            <button class="calendar-nav-btn" id="reportNext"><i class="fa-solid fa-chevron-right"></i></button>

        </div>

        <div class="report-total">รวมทั้งเดือน <strong>${total.toLocaleString("th-TH")} บาท</strong></div>

    `;

    document.getElementById("reportPrev").addEventListener("click", ()=>{

        reportViewDate.setMonth(reportViewDate.getMonth() - 1);

        renderReport();

    });

    document.getElementById("reportNext").addEventListener("click", ()=>{

        reportViewDate.setMonth(reportViewDate.getMonth() + 1);

        renderReport();

    });

    renderBarChart(container, dataPoints);

}

function renderMonthlyReport(bookings, container, navContainer){

    const year = reportViewDate.getFullYear();

    const revenueByMonth = new Array(12).fill(0);

    bookings.forEach(b=>{

        const d = new Date(b["วันที่นัด"]);

        if(isNaN(d)) return;

        if(d.getFullYear() === year){

            revenueByMonth[d.getMonth()] += calculateBookingRevenue(b);

        }

    });

    const dataPoints = REPORT_MONTH_SHORT.map((label,i)=>({ label, value:revenueByMonth[i] }));

    const total = revenueByMonth.reduce((s,v)=>s + v, 0);

    navContainer.innerHTML = `

        <div class="report-nav-row">

            <button class="calendar-nav-btn" id="reportPrev"><i class="fa-solid fa-chevron-left"></i></button>

            <div class="report-nav-label">ปี ${year + 543}</div>

            <button class="calendar-nav-btn" id="reportNext"><i class="fa-solid fa-chevron-right"></i></button>

        </div>

        <div class="report-total">รวมทั้งปี <strong>${total.toLocaleString("th-TH")} บาท</strong></div>

    `;

    document.getElementById("reportPrev").addEventListener("click", ()=>{

        reportViewDate.setFullYear(reportViewDate.getFullYear() - 1);

        renderReport();

    });

    document.getElementById("reportNext").addEventListener("click", ()=>{

        reportViewDate.setFullYear(reportViewDate.getFullYear() + 1);

        renderReport();

    });

    renderBarChart(container, dataPoints);

}

function renderYearlyReport(bookings, container, navContainer){

    const revenueByYear = {};

    bookings.forEach(b=>{

        const d = new Date(b["วันที่นัด"]);

        if(isNaN(d)) return;

        const y = d.getFullYear();

        revenueByYear[y] = (revenueByYear[y] || 0) + calculateBookingRevenue(b);

    });

    const years = Object.keys(revenueByYear).map(Number).sort((a,b)=>a - b);

    const total = years.reduce((s,y)=>s + revenueByYear[y], 0);

    navContainer.innerHTML = `

        <div class="report-total">รวมทุกปี <strong>${total.toLocaleString("th-TH")} บาท</strong></div>

    `;

    if(years.length === 0){

        container.innerHTML = `

            <div class="empty-card">
                <img src="images/Tiger4.png" alt="" class="empty-tiger">
                ยังไม่มีข้อมูลรายได้
            </div>

        `;

        return;

    }

    const dataPoints = years.map(y=>({ label:String(y + 543), value:revenueByYear[y] }));

    renderBarChart(container, dataPoints);

}

//------------------------------------------
// ตั้งค่า (Settings)
//------------------------------------------

async function showSettings(){

    if(!currentUserProfile || currentUserProfile.role !== "owner"){

        navigateToPage("dashboard");

        return;

    }

    pageTitle.innerHTML = "ตั้งค่า";

    pageSubtitle.innerHTML = "ปรับค่าระบบโดยไม่ต้องแก้โค้ด";

    pageContent.innerHTML = `

        <div class="booking-card">

            <div class="booking-header">

                <h2>

                    <i class="fa-solid fa-gear"></i>

                    ตั้งค่าระบบ

                </h2>

                <p>

                    การเปลี่ยนแปลงมีผลทันทีหลังกดบันทึก

                </p>

            </div>

            <div id="settingsForm">

                <div class="loading-card">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>กำลังโหลดการตั้งค่า...</h3>
                </div>

            </div>

        </div>

        <div class="booking-card" id="accountsCard">

            <div class="booking-header">

                <h2>

                    <i class="fa-solid fa-users-gear"></i>

                    จัดการบัญชี

                </h2>

                <p>

                    เพิ่ม/ลบบัญชีแอดมิน และตั้งรหัสผ่านใหม่ได้จากที่นี่

                </p>

            </div>

            <div id="accountsSection">

                <div class="loading-card">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>กำลังโหลดรายชื่อบัญชี...</h3>
                </div>

            </div>

        </div>

    `;

    let current = { notifyEmail:"", appointmentDuration:2, warrantyDays:60, themeId:"orange", couponTier2Percent:10, couponTier3Percent:15, couponTier5Percent:30 };

    try{

        const { data, error } = await supabaseClient

            .from("app_settings")

            .select("*")

            .eq("id", 1)

            .single();

        if(error) throw error;

        current = {

            notifyEmail: data.notify_email || "",

            appointmentDuration: data.appointment_duration || 2,

            warrantyDays: data.warranty_days || 60,

            themeId: data.theme_id || "orange",

            couponTier2Percent: data.coupon_tier2_percent ?? 10,

            couponTier3Percent: data.coupon_tier3_percent ?? 15,

            couponTier5Percent: data.coupon_tier5_percent ?? 30

        };

    }catch(error){

        console.error(error);

    }

    const formEl = document.getElementById("settingsForm");

    if(!formEl) return; // ผู้ใช้เปลี่ยนหน้าไปแล้วระหว่างโหลด

    formEl.innerHTML = `

        <form id="settingsFormEl" class="booking-form">

            <div class="form-section-label full-width">
                <i class="fa-solid fa-bell"></i> การแจ้งเตือน
            </div>

            <div class="form-group full-width">

                <label>อีเมลรับแจ้งเตือนคิวใหม่/แก้ไข</label>

                <input
                    type="email"
                    id="settingNotifyEmail"
                    placeholder="your-email@gmail.com"
                    value="${current.notifyEmail || ""}">

            </div>

            <div class="form-section-label full-width">
                <i class="fa-solid fa-palette"></i> ธีมสีเว็บไซต์
            </div>

            <div class="form-group full-width">

                <div class="theme-picker" id="themePicker">

                    ${Object.entries(THEME_PRESETS).map(([id, t])=>`

                        <div class="theme-option ${current.themeId === id ? "active" : ""}" data-theme="${id}">

                            <div class="theme-swatch">
                                <span style="background:${t.primary};"></span>
                                <span style="background:${t.yellow};"></span>
                                <span style="background:${t.pink};"></span>
                                <span style="background:${t.blue};"></span>
                            </div>

                            <div class="theme-name">${t.label}</div>

                        </div>

                    `).join("")}

                </div>

                <input type="hidden" id="settingThemeId" value="${current.themeId || "orange"}">

            </div>

            <div class="form-section-label full-width">
                <i class="fa-solid fa-calendar-days"></i> การนัดหมาย
            </div>

            <div class="form-group">

                <label>ระยะเวลาต่อคิว (ชั่วโมง)</label>

                <input
                    type="number"
                    id="settingDuration"
                    min="1"
                    step="0.5"
                    value="${current.appointmentDuration || 2}">

            </div>

            <div class="form-group">

                <label>ระยะเวลาประกันหลังสัก (วัน)</label>

                <input
                    type="number"
                    id="settingWarranty"
                    min="1"
                    value="${current.warrantyDays || 60}">

            </div>

            <div class="form-section-label full-width">
                <i class="fa-solid fa-ticket"></i> คูปองสะสม (ปรับ % ส่วนลดเอง)
            </div>

            <div class="form-group">

                <label>ครั้งที่ 2 (ลด %)</label>

                <input
                    type="number"
                    id="settingCouponTier2"
                    min="0"
                    max="100"
                    value="${current.couponTier2Percent}">

            </div>

            <div class="form-group">

                <label>ครั้งที่ 3 (ลด %)</label>

                <input
                    type="number"
                    id="settingCouponTier3"
                    min="0"
                    max="100"
                    value="${current.couponTier3Percent}">

            </div>

            <div class="form-group">

                <label>ครั้งที่ 5 (ลด %)</label>

                <input
                    type="number"
                    id="settingCouponTier5"
                    min="0"
                    max="100"
                    value="${current.couponTier5Percent}">

            </div>

            <div class="form-group full-width" style="font-size:13px; color:var(--sub);">

                * ครั้งที่ 4 และ 6 เป็น "Buy 1 Get 1" (ไม่ใช่ % ส่วนลด) ยังคงกำหนดตายตัวในระบบ ไม่ได้ปรับที่นี่

            </div>

            <div class="form-group full-width">

                <button type="submit" class="save-btn">

                    <i class="fa-solid fa-floppy-disk"></i>
                    บันทึกการตั้งค่า

                </button>

            </div>

        </form>

    `;

    document.querySelectorAll(".theme-option").forEach(opt=>{

        opt.addEventListener("click", function(){

            document.querySelectorAll(".theme-option").forEach(o=>o.classList.remove("active"));

            this.classList.add("active");

            const themeId = this.dataset.theme;

            document.getElementById("settingThemeId").value = themeId;

            applyTheme(themeId); // พรีวิวทันที ยังไม่บันทึกจนกว่าจะกด "บันทึกการตั้งค่า"

        });

    });

    document.getElementById("settingsFormEl").addEventListener("submit", async function(e){

        e.preventDefault();

        const btn = this.querySelector(".save-btn");

        btn.disabled = true;

        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...`;

        const row = {

            notify_email: document.getElementById("settingNotifyEmail").value.trim(),

            appointment_duration: Number(document.getElementById("settingDuration").value) || 2,

            warranty_days: Number(document.getElementById("settingWarranty").value) || 60,

            theme_id: document.getElementById("settingThemeId").value,

            coupon_tier2_percent: Number(document.getElementById("settingCouponTier2").value) || 10,

            coupon_tier3_percent: Number(document.getElementById("settingCouponTier3").value) || 15,

            coupon_tier5_percent: Number(document.getElementById("settingCouponTier5").value) || 30

        };

        try{

            const { error } = await supabaseClient

                .from("app_settings")

                .update(row)

                .eq("id", 1);

            if(error) throw error;

            // ส่งค่าไปให้ Apps Script ด้วย เพื่อให้อีเมลแจ้งเตือน/Calendar ใช้อีเมล-ระยะเวลาที่ตั้งไว้จริง
            // (ไม่บล็อกการบันทึก ถ้าจุดนี้พลาดแค่ log ไว้ ตั้งค่าฝั่ง Supabase ยังสำเร็จตามปกติ)
            await syncSettingsToAppsScript({

                notifyEmail: row.notify_email,
                appointmentDuration: row.appointment_duration,
                warrantyDays: row.warranty_days,
                themeId: row.theme_id

            });

            showToast("บันทึกการตั้งค่าสำเร็จ", "success");

            await loadAppSettings(); // รีเฟรชค่าที่ใช้ในแอปทันที (เช่น การคำนวณประกัน)

        }catch(error){

            console.error(error);

            showToast(error.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

        }finally{

            btn.disabled = false;

            btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> บันทึกการตั้งค่า`;

        }

    });

    loadAccountsSection();

}

//------------------------------------------
// เช็คคิวซ้ำ + บันทึกคิวใหม่ลง Google Sheets
// (ใช้ร่วมกันทั้งฟอร์มจองใหม่ และ popup "เพิ่มคิวลูกค้าเดิม")
//------------------------------------------

function isSameDay(d1, d2){

    const a = new Date(d1);
    a.setHours(0,0,0,0);

    const b = new Date(d2);
    b.setHours(0,0,0,0);

    return a.getTime() === b.getTime();

}

//------------------------------------------
// สะพานเชื่อม Calendar/อีเมล (ผ่าน Apps Script) - เรียกทุกครั้งที่มีการ
// เพิ่ม/แก้/ลบ/เปลี่ยนสถานะคิว เพื่อ sync กับ Google Calendar ให้ตรงกัน
//------------------------------------------

//------------------------------------------
// สะพานเชื่อม -> Google Apps Script (ผ่าน JSONP)
// ⚠️ เลี่ยง fetch() ตรงๆ เพราะ Apps Script /exec ถูกเบราว์เซอร์บล็อกด้วย
// CORS เสมอ (Google ไม่แนบ Access-Control-Allow-Origin มาให้) ไม่ว่าจะยิง
// แบบ GET หรือ POST ก็โดนบล็อกจนอ่านผลลัพธ์ไม่ได้เหมือนกัน วิธีที่ใช้ได้จริง
// คือฝัง <script src="..."> แล้วให้ Apps Script ตอบกลับมาเป็นฟังก์ชัน callback
// แทน JSON ตรงๆ (การโหลด <script> ไม่ติด CORS เหมือน fetch)
//------------------------------------------

let _appsScriptJsonpCounter = 0;

function _sleep(ms){

    return new Promise(resolve => setTimeout(resolve, ms));

}

// พยายามโหลด <script> JSONP ครั้งเดียว (ไม่ retry) — ใช้เป็น building block ให้ callAppsScriptJSONP เรียกซ้ำได้
function _attemptAppsScriptJSONP(params){

    return new Promise((resolve)=>{

        const callbackName = `_appsScriptCb${Date.now()}_${_appsScriptJsonpCounter++}`;

        const timeoutId = setTimeout(()=>{

            cleanup();

            resolve({ success:false, message:"หมดเวลาเชื่อมต่อ Apps Script" });

        }, 15000);

        function cleanup(){

            clearTimeout(timeoutId);

            delete window[callbackName];

            const tag = document.getElementById(callbackName);

            if(tag) tag.remove();

        }

        window[callbackName] = function(result){

            cleanup();

            resolve(result);

        };

        const query = new URLSearchParams({ ...params, callback: callbackName }).toString();

        const script = document.createElement("script");

        script.id = callbackName;
        script.src = `${WEB_APP_URL}?${query}`;

        script.onerror = function(){

            cleanup();

            resolve({ success:false, message:"โหลดสคริปต์จาก Apps Script ไม่สำเร็จ" });

        };

        document.body.appendChild(script);

    });

}

// ⚠️ มือถือ (โดยเฉพาะตอนสลับ WiFi/4G หรือสัญญาณกระตุกตอนเปลี่ยนหน้า/สลับบัญชี)
// มีโอกาสโหลด <script src="..."> พลาดแบบ network-level เฉยๆ ทั้งที่ไม่ใช่ปัญหาจากฝั่ง
// Apps Script เลย เดิมพลาดครั้งเดียวจบเลย (ไม่ retry) เลยเจอ error "โหลดสคริปต์...ไม่สำเร็จ"
// บ่อยกว่าที่ควรบนมือถือ ตอนนี้เพิ่ม retry อัตโนมัติสูงสุด 2 ครั้ง (รวมพยายาม 3 ครั้ง)
// ก่อนจะยอมแพ้จริงๆ โดยเว้นระยะสั้นๆ ให้เครือข่ายมีเวลาตั้งตัว
async function callAppsScriptJSONP(params, maxRetries = 2){

    let lastResult = null;

    for(let attempt = 0; attempt <= maxRetries; attempt++){

        lastResult = await _attemptAppsScriptJSONP(params);

        if(lastResult && lastResult.success) return lastResult;

        // error ประเภทที่เกิดจากเครือข่ายเท่านั้นถึงจะ retry (ไม่ retry ถ้า Apps Script ตอบกลับมาแล้วว่า
        // สิทธิ์ไม่ผ่าน/ข้อมูลผิด เพราะ retry ไปก็ได้ผลเดิม)
        const isNetworkIssue = lastResult && (
            lastResult.message === "โหลดสคริปต์จาก Apps Script ไม่สำเร็จ" ||
            lastResult.message === "หมดเวลาเชื่อมต่อ Apps Script"
        );

        if(!isNetworkIssue || attempt === maxRetries) break;

        await _sleep(900 * (attempt + 1)); // เว้นระยะเพิ่มขึ้นทุกครั้งที่ retry (900ms, 1800ms)

    }

    return lastResult;

}

async function syncCalendar(operation, eventId, bookingId){

    try{

        // ⚠️ ส่งแค่ id ของคิว ไม่ส่งข้อมูลเต็มๆ ไปทาง URL แล้ว เพราะถ้า "รายละเอียด"
        // ยาว (ข้อความภาษาไทยเข้ารหัสเป็น URL แล้วบวมมาก) จะทำให้ URL ยาวเกินไป
        // จนเบราว์เซอร์/Google ไม่ยอมโหลด สคริปต์เลยไม่ถูกเรียกไปเลยเงียบๆ
        // (คิวรายละเอียดสั้นๆ เลยส่งผ่าน แต่คิวรายละเอียดยาวไม่ผ่าน ตรงกับที่เจอ)
        // ฝั่ง Apps Script จะไปดึงข้อมูลเต็มจาก Supabase เองด้วย bookingId นี้แทน

        const payload = {

            action: "syncCalendar",

            operation: operation,

            eventId: eventId || "",

            bookingId: bookingId || ""

        };

        return await callAppsScriptJSONP({

            action: "syncCalendar",

            data: JSON.stringify(payload)

        });

    }catch(error){

        console.error("Sync Calendar ไม่สำเร็จ:", error);

        return { success:false };

    }

}

//------------------------------------------
// สะพานเชื่อม "ตั้งค่า" -> Google Apps Script
// (ให้อีเมลแจ้งเตือน/ระยะเวลานัด ที่ตั้งในหน้าตั้งค่า ไปมีผลจริงตอน
// สร้าง Calendar event / ส่งอีเมล ฝั่ง Apps Script ด้วย ไม่ใช่แค่บันทึกใน Supabase)
//------------------------------------------

async function syncSettingsToAppsScript(payload){

    try{

        const data = {

            notifyEmail: payload.notifyEmail,

            appointmentDuration: payload.appointmentDuration,

            warrantyDays: payload.warrantyDays,

            themeId: payload.themeId,

            accessToken: await getAccessToken() // Apps Script เช็คซ้ำว่าเป็นเจ้าของร้านจริงก่อนบันทึก

        };

        return await callAppsScriptJSONP({

            action: "updateSettings",

            data: JSON.stringify(data)

        });

    }catch(error){

        console.error("Sync ตั้งค่าไปที่ Apps Script ไม่สำเร็จ:", error);

        return { success:false };

    }

}

//------------------------------------------
// จัดการบัญชีผู้ใช้ (เจ้าของร้าน / แอดมิน) - เรียกผ่าน Apps Script เท่านั้น
// เพราะการสร้าง/ลบ/แก้บัญชีต้องใช้ service key ที่ไม่ควรฝังไว้ในเว็บ
// Apps Script จะเช็คซ้ำอีกชั้นว่าคนเรียกเป็น "เจ้าของร้าน" จริงก่อนทำงานทุกครั้ง
// (หน้านี้เข้าได้แค่ role owner อยู่แล้วจาก navigateToPage แต่เช็คซ้ำฝั่ง server เผื่อมีคนเรียก action ตรงๆ)
//------------------------------------------

async function getAccessToken(){

    const { data: { session } } = await supabaseClient.auth.getSession();

    return session ? session.access_token : null;

}

async function callAccountAction(action, extra){

    const accessToken = await getAccessToken();

    if(!accessToken){

        showToast("เซสชันหมดอายุ กรุณาล็อคอินใหม่", "error");

        return { success:false };

    }

    const payload = Object.assign({ accessToken: accessToken }, extra);

    return await callAppsScriptJSONP({

        action: action,

        data: JSON.stringify(payload)

    });

}

async function loadAccountsSection(){

    const container = document.getElementById("accountsSection");

    if(!container) return;

    const result = await callAccountAction("listAccounts", {});

    if(!container.isConnected) return; // ผู้ใช้เปลี่ยนหน้าไปแล้วระหว่างโหลด

    if(!result || !result.success){

        container.innerHTML = `

            <div class="empty-card" style="padding:20px;">

                โหลดรายชื่อบัญชีไม่สำเร็จ ${result && result.message ? "(" + result.message + ")" : ""}

                <div style="margin-top:12px;">

                    <button type="button" class="table-action-btn" onclick="loadAccountsSection()">

                        <i class="fa-solid fa-rotate-right"></i> ลองใหม่

                    </button>

                </div>

            </div>

        `;

        return;

    }

    renderAccountsTable(result.accounts || []);

}

function renderAccountsTable(accounts){

    const container = document.getElementById("accountsSection");

    if(!container) return;

    const rowsHTML = accounts.map(acc => `

        <tr>

            <td>${acc.username}</td>

            <td><span class="role-badge role-${acc.role}">${acc.role === "owner" ? "เจ้าของร้าน" : "แอดมิน"}</span></td>

            <td>${acc.createdAt ? formatDate(acc.createdAt) : "-"}</td>

            <td style="text-align:right;white-space:nowrap;">

                <button class="table-action-btn" onclick="openChangePasswordPopup('${acc.id}', '${(acc.username||"").replace(/'/g, "\\'")}')" title="เปลี่ยนรหัสผ่าน">
                    <i class="fa-solid fa-key"></i>
                </button>

                <button class="table-action-btn table-action-danger" onclick="confirmDeleteAccount('${acc.id}', '${(acc.username||"").replace(/'/g, "\\'")}')" title="ลบบัญชี">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </td>

        </tr>

    `).join("");

    container.innerHTML = `

        <div style="overflow-x:auto;">

            <table class="accounts-table">

                <thead>

                    <tr>
                        <th>Username</th>
                        <th>สิทธิ์</th>
                        <th>สร้างเมื่อ</th>
                        <th></th>
                    </tr>

                </thead>

                <tbody>

                    ${rowsHTML || `<tr><td colspan="4" style="text-align:center;color:var(--sub);padding:16px;">ยังไม่มีบัญชี</td></tr>`}

                </tbody>

            </table>

        </div>

        <button type="button" class="save-btn" style="margin-top:16px;" onclick="openAddAccountPopup()">
            <i class="fa-solid fa-user-plus"></i> เพิ่มบัญชีใหม่
        </button>

    `;

}

function openAddAccountPopup(){

    const oldPopup = document.getElementById("addAccountPopup");

    if(oldPopup) oldPopup.remove();

    const popup = document.createElement("div");

    popup.id = "addAccountPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:420px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon" style="background:var(--blue);">
                            <i class="fa-solid fa-user-plus"></i>
                        </div>

                        <div>
                            <h2>เพิ่มบัญชีใหม่</h2>
                            <p>กำหนด Username / Password / สิทธิ์</p>
                        </div>

                    </div>

                    <button class="view-customer-close" onclick="document.getElementById('addAccountPopup').remove()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>

                <div class="view-customer-body">

                    <div class="form-group full-width">
                        <label>Username</label>
                        <input type="text" id="newAccountUsername" autocapitalize="off" autocorrect="off" spellcheck="false">
                    </div>

                    <div class="form-group full-width">
                        <label>Password (อย่างน้อย 6 ตัวอักษร)</label>
                        <input type="password" id="newAccountPassword">
                    </div>

                    <div class="form-group full-width">
                        <label>สิทธิ์</label>
                        <select id="newAccountRole">
                            <option value="admin">แอดมิน (เข้าหน้าตั้งค่าไม่ได้)</option>
                            <option value="owner">เจ้าของร้าน (ทำได้ทุกอย่าง)</option>
                        </select>
                    </div>

                </div>

                <div class="view-customer-footer two-buttons">

                    <button class="view-customer-close-btn view-customer-btn-outline" onclick="document.getElementById('addAccountPopup').remove()">
                        <i class="fa-solid fa-xmark"></i>
                        ยกเลิก
                    </button>

                    <button class="view-customer-close-btn" id="confirmAddAccountBtn" style="background:var(--primary);color:#ffffff;">
                        <i class="fa-solid fa-check"></i>
                        เพิ่มบัญชี
                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    document.getElementById("confirmAddAccountBtn").addEventListener("click", submitAddAccount);

}

async function submitAddAccount(){

    const username = document.getElementById("newAccountUsername").value.trim();
    const password = document.getElementById("newAccountPassword").value;
    const role = document.getElementById("newAccountRole").value;

    if(!username){

        showToast("กรุณากรอก Username", "warning");

        return;

    }

    if(!password || password.length < 6){

        showToast("Password ต้องมีอย่างน้อย 6 ตัวอักษร", "warning");

        return;

    }

    const btn = document.getElementById("confirmAddAccountBtn");

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังเพิ่ม...`;

    const result = await callAccountAction("createAccount", { username: username, password: password, role: role });

    if(result && result.success){

        showToast("เพิ่มบัญชีสำเร็จ", "success");

        const popup = document.getElementById("addAccountPopup");

        if(popup) popup.remove();

        await loadAccountsSection();

    }else{

        showToast((result && result.message) || "เพิ่มบัญชีไม่สำเร็จ", "error");

        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check"></i> เพิ่มบัญชี`;

    }

}

function openChangePasswordPopup(userId, username){

    const oldPopup = document.getElementById("changePasswordPopup");

    if(oldPopup) oldPopup.remove();

    const popup = document.createElement("div");

    popup.id = "changePasswordPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:400px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon" style="background:var(--yellow);">
                            <i class="fa-solid fa-key"></i>
                        </div>

                        <div>
                            <h2>เปลี่ยนรหัสผ่าน</h2>
                            <p>${username}</p>
                        </div>

                    </div>

                    <button class="view-customer-close" onclick="document.getElementById('changePasswordPopup').remove()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>

                <div class="view-customer-body">

                    <div class="form-group full-width">
                        <label>Password ใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
                        <input type="password" id="changePasswordInput">
                    </div>

                </div>

                <div class="view-customer-footer two-buttons">

                    <button class="view-customer-close-btn view-customer-btn-outline" onclick="document.getElementById('changePasswordPopup').remove()">
                        <i class="fa-solid fa-xmark"></i>
                        ยกเลิก
                    </button>

                    <button class="view-customer-close-btn" id="confirmChangePasswordBtn" style="background:var(--primary);color:#ffffff;">
                        <i class="fa-solid fa-check"></i>
                        บันทึก
                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    document.getElementById("confirmChangePasswordBtn").addEventListener("click", function(){

        submitChangePassword(userId);

    });

}

async function submitChangePassword(userId){

    const password = document.getElementById("changePasswordInput").value;

    if(!password || password.length < 6){

        showToast("Password ต้องมีอย่างน้อย 6 ตัวอักษร", "warning");

        return;

    }

    const btn = document.getElementById("confirmChangePasswordBtn");

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...`;

    const result = await callAccountAction("updateAccountPassword", { userId: userId, password: password });

    if(result && result.success){

        showToast("เปลี่ยนรหัสผ่านสำเร็จ", "success");

        const popup = document.getElementById("changePasswordPopup");

        if(popup) popup.remove();

    }else{

        showToast((result && result.message) || "เปลี่ยนรหัสผ่านไม่สำเร็จ", "error");

        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check"></i> บันทึก`;

    }

}

function confirmDeleteAccount(userId, username){

    if(currentUserProfile && currentUserProfile.id === userId){

        showToast("ลบบัญชีที่ล็อคอินอยู่ตอนนี้ไม่ได้", "warning");

        return;

    }

    const oldPopup = document.getElementById("deleteAccountPopup");

    if(oldPopup) oldPopup.remove();

    const popup = document.createElement("div");

    popup.id = "deleteAccountPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:400px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon">
                            <i class="fa-solid fa-trash"></i>
                        </div>

                        <div>
                            <h2>ยืนยันการลบบัญชี</h2>
                            <p>${username}</p>
                        </div>

                    </div>

                    <button class="view-customer-close" onclick="document.getElementById('deleteAccountPopup').remove()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>

                <div class="view-customer-body">

                    <p style="font-size:15px;line-height:1.7;color:#000000;text-align:center;">
                        ต้องการลบบัญชีนี้ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
                    </p>

                </div>

                <div class="view-customer-footer two-buttons">

                    <button class="view-customer-close-btn view-customer-btn-outline" onclick="document.getElementById('deleteAccountPopup').remove()">
                        <i class="fa-solid fa-xmark"></i>
                        ยกเลิก
                    </button>

                    <button class="view-customer-close-btn view-customer-btn-danger" id="confirmDeleteAccountBtn">
                        <i class="fa-solid fa-trash"></i>
                        ลบเลย
                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    document.getElementById("confirmDeleteAccountBtn").addEventListener("click", function(){

        deleteAccountNow(userId, this);

    });

}

async function deleteAccountNow(userId, btnEl){

    if(btnEl){

        btnEl.disabled = true;
        btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังลบ...`;

    }

    const result = await callAccountAction("deleteAccount", { userId: userId });

    if(result && result.success){

        showToast("ลบบัญชีสำเร็จ", "success");

        const popup = document.getElementById("deleteAccountPopup");

        if(popup) popup.remove();

        await loadAccountsSection();

    }else{

        showToast((result && result.message) || "ลบบัญชีไม่สำเร็จ", "error");

        if(btnEl){

            btnEl.disabled = false;
            btnEl.innerHTML = `<i class="fa-solid fa-trash"></i> ลบเลย`;

        }

    }

}

async function submitNewBooking(bookingData, submitBtn, resetBtn, onSuccess){

//--------------------------------------
// Validation
//--------------------------------------

if (bookingData.name === "") {

    showToast("กรุณากรอกชื่อลูกค้า", "warning");

    return;

}

if (bookingData.phone === "") {

    showToast("กรุณากรอกเบอร์โทร", "warning");

    return;

}

if (bookingData.phone.length !== 10) {

    showToast("เบอร์โทรต้องมี 10 หลัก", "warning");

    return;

}

if (bookingData.date === "") {

    showToast("กรุณาเลือกวันที่นัด", "warning");

    return;

}

if (bookingData.time === "") {

    showToast("กรุณาเลือกเวลานัด", "warning");

    return;

}

//--------------------------------------
// เช็คคิวซ้ำ (กันดับเบิลบุ๊กกิ้ง)
//--------------------------------------

submitBtn.disabled = true;

submitBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
        กำลังตรวจสอบคิว...
`;

let existingBookings = [];

try{

    existingBookings = await loadBookings();

}catch(error){

    console.error(error);

    showToast("ตรวจสอบคิวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

    resetBtn();

    return;

}

const isDuplicate = existingBookings.some(booking => {

    if(booking["สถานะ"] === "ยกเลิก") return false;

    if(!booking["วันที่นัด"] || !booking["เวลานัด"]) return false;

    const sameDate = isSameDay(booking["วันที่นัด"], bookingData.date);

    const sameTime = formatTime(booking["เวลานัด"]) === bookingData.time;

    return sameDate && sameTime;

});

if(isDuplicate){

    showToast(`เวลา ${bookingData.time} ของวันที่เลือก มีคิวจองอยู่แล้ว กรุณาเลือกเวลาอื่น`, "warning");

    resetBtn();

    return;

}

submitBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
        กำลังบันทึก...
`;

//--------------------------------------
// บันทึกลง Supabase
//--------------------------------------

try{

    const row = mapBookingToRow(bookingData);

    const { data: inserted, error: insertError } = await supabaseClient

        .from("bookings")

        .insert(row)

        .select()

        .single();

    if(insertError) throw insertError;

    let newBooking = mapRowToBooking(inserted);

    // ยิงไปสร้าง Calendar event + ส่งอีเมลแจ้งเตือน ผ่านสะพาน Apps Script
    // (ไม่ทำให้การจองคิวล้มเหลวถ้าจุดนี้พลาด แค่จะไม่มี Calendar/อีเมลเฉยๆ)
    const syncResult = await syncCalendar("create", "", newBooking["ID"]);

    if(syncResult.success && syncResult.eventId){

        await supabaseClient

            .from("bookings")

            .update({ calendar_event_id: syncResult.eventId })

            .eq("id", newBooking["ID"]);

        newBooking["Event ID"] = syncResult.eventId;

    }

    onSuccess(newBooking);

}catch(error){

    console.error(error);

    showToast("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

    resetBtn();

}

}

//------------------------------------------
// Booking Form Submit
//------------------------------------------

document.addEventListener("submit", async function(e){

    if(e.target.id !== "bookingForm") return;

    e.preventDefault();

    const submitBtn = document.querySelector(".save-btn");

    function resetBtn(){

        submitBtn.disabled = false;

        submitBtn.innerHTML = `
            <i class="fa-solid fa-floppy-disk"></i>
            บันทึกข้อมูล
        `;

    }

    const bookingData = {

        name: document.getElementById("customerName").value.trim(),

        phone: document.getElementById("customerPhone").value.trim(),

        contact: document.getElementById("customerContact").value.trim(),

        date: document.getElementById("bookingDate").value,

        time: document.getElementById("bookingTime").value,

        price: document.getElementById("bookingPrice").value,

        deposit: document.getElementById("bookingDeposit").value,

        status: document.getElementById("bookingStatus").value,

        detail: document.getElementById("bookingDetail").value.trim(),

        note: document.getElementById("customerNote").value.trim()

    };

    await submitNewBooking(bookingData, submitBtn, resetBtn, async (newBooking)=>{

        submitBtn.innerHTML = `
            <i class="fa-solid fa-check"></i>
            บันทึกสำเร็จ
        `;

        if(pendingBookingPhotos.length > 0){

            // ⚠️ ชั่วคราว: ระบบรูปผลงานยังผูกกับ Apps Script/Drive แบบเดิมอยู่
            // ยังใช้ไม่ได้เต็มที่จนกว่าจะย้ายไป Supabase Storage ในเฟสถัดไป

            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลดรูป...`;

            for(const file of pendingBookingPhotos){

                await uploadPhotoForBookingId(newBooking["ID"], file);

            }

            pendingBookingPhotos = [];

        }

        document.getElementById("bookingForm").reset();

        showToast("จองคิวสำเร็จ", "success");

        setTimeout(()=>{

            resetBtn();

        },1000);

    });

});
//------------------------------------------
// Load Booking
//------------------------------------------

async function loadBookings(){

    try{

        const { data, error } = await supabaseClient

            .from("bookings")

            .select("*")

            .order("booking_date", { ascending:true });

        if(error) throw error;

        const mapped = data.map(mapRowToBooking);

        console.log("Booking Data (Supabase)");

        console.table(mapped);

        return mapped;

    }

    catch(error){

        console.error(error);

        return [];

    }

}
//------------------------------------------
// Dashboard
//------------------------------------------
function formatTime(timeString){

    if(!timeString) return "-";

    // รองรับข้อความเวลาธรรมดา "HH:MM" หรือ "HH:MM:SS" (แบบที่ Supabase ส่งมา) โดยตรง
    const match = String(timeString).match(/^(\d{1,2}):(\d{2})/);

    if(match){

        return `${match[1].padStart(2,"0")}:${match[2]}`;

    }

    // เผื่อกรณีข้อมูลเก่าที่ยังเป็น Date เต็มรูปแบบอยู่
    const date = new Date(timeString);

    if(isNaN(date)) return "-";

    return date.toLocaleTimeString("th-TH",{

        hour:"2-digit",
        minute:"2-digit",
        hour12:false

    });

}
function formatDate(dateString){

    const date = new Date(dateString);

    return date.toLocaleDateString("th-TH",{

        day:"numeric",
        month:"long",
        year:"numeric"

    });

}

//------------------------------------------
// คัดลอกข้อความยืนยันคิว (ใช้ตอนลูกค้าโอนมัดจำเสร็จแล้ว) - วางในแชทไลน์ได้เลย
//------------------------------------------

function buildBookingSummaryText(data){

    const price = Number(data.price) || 0;
    const deposit = Number(data.deposit) || 0;
    const remaining = Math.max(price - deposit, 0);

    const dateLabel = data.date ? formatDate(data.date) : "-";
    const timeLabel = data.time ? formatTime(data.time) : "-";

    return `✅ได้รับยอดมัดจำเรียบร้อยค่ะ🙏🏻✨

📌 รายละเอียดการนัดหมาย (ยืนยันคิว)
ชื่อลูกค้า: ${data.name || "-"}
วัน-เวลา: ${dateLabel} เวลา ${timeLabel} น.
ลายสัก/ตำแหน่ง: ${data.detail || "-"}
ราคาเต็ม: ${price.toLocaleString("th-TH")} บาท
มัดจำแล้ว: ${deposit.toLocaleString("th-TH")} บาท
เหลือชำระหลังจบงาน: ${remaining.toLocaleString("th-TH")} บาท

✨ การเตรียมตัวก่อนถึงวันมาสัก
เพื่อให้งานสักออกมาสวยงามและผิวพร้อมที่สุด รบกวนคุณลูกค้าเตรียมตัวดังนี้นะคะ
♡ พักผ่อนให้เพียงพอ (7-8 hr.)
♡ งดเครื่องดื่มแอลกอฮอล์ก่อนวันสัก 
♡ ควรทานอาหารรองท้องมาให้เรียบร้อย 
♡ สวมเสื้อผ้าสบายๆ ที่ขยับสะดวก 
♡ งดการขัด/สครับผิว/อาบแดด 1 week

📍 แผนที่ร้าน | Google Map 
 https://maps.app.goo.gl/X8AF9AWaJtYZTY2Y6?g_st=ic

 🏠 จุดสังเกตหน้าร้าน : หน้าร้านมีเก้าอี้สีเหลือง ประตูกระจกสีเขียว อยู่ข้างๆร้านขายน้ำแพ็ก อยู่ฝั่งตรงข้ามชลธีสหคลินิก 

🚗🛵 : ( ภาพหน้าร้าน วงตำแหน่งที่จอด) สามารถจอดบริเวณหน้าร้านสัก และ หน้าร้านSMT คลังน็อต ได้เลยนะคะ หากจอดหน้าร้านน็อตให้แจ้งกับทางพนักงานว่ามาร้านสักนะคะ *ขอความกรุณาไม่จอดรถบังหน้าร้านอื่นๆนะคะ ขอบคุณค่ะ🙇🏻‍♀️

 ⚠️ หากต้องการเลื่อนคิว รบกวนแจ้งล่วงหน้าอย่างน้อย 3 วันนะคะ (หากแจ้งกะทันหันขอสงวนสิทธิ์ในการคืนเงินมัดจำทุกกรณี)

⏰ ในวันนัดหมาย กรุณามาตรงเวลา หากมาช้ากว่ากำหนดโดยไม่แจ้งล่วงหน้าเกิน 30 นาทีขออนุญาติยกเลิกคิวและยึดเงินมัดจำ [สามารถมาก่อนเวลาได้ไม่เกิน 30 นาที]

💬 หากมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม แจ้งแอดมินได้ตลอดเลยนะคะ แล้วพบกันค่ะ 🙇🏻‍♀️`;

}

function copyBookingSummary(btn){

    const data = {
        name: btn.dataset.name,
        phone: btn.dataset.phone,
        date: btn.dataset.date,
        time: btn.dataset.time,
        detail: btn.dataset.detail,
        price: btn.dataset.price,
        deposit: btn.dataset.deposit
    };

    const message = buildBookingSummaryText(data);

    copyTextToClipboard(message);

}

// ใช้ execCommand เป็นตัวสำรอง เผื่อ navigator.clipboard ใช้ไม่ได้ (เบราว์เซอร์เก่า/ไม่ใช่ HTTPS)
function copyTextToClipboard(text){

    if(navigator.clipboard && navigator.clipboard.writeText){

        navigator.clipboard.writeText(text)
            .then(()=> showToast("คัดลอกข้อความยืนยันคิวแล้ว วางในแชทไลน์ได้เลย", "success"))
            .catch(()=> fallbackCopyText(text));

    }else{

        fallbackCopyText(text);

    }

}

function fallbackCopyText(text){

    try{

        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        document.execCommand("copy");

        document.body.removeChild(textarea);

        showToast("คัดลอกข้อความยืนยันคิวแล้ว วางในแชทไลน์ได้เลย", "success");

    }catch(err){

        console.error("คัดลอกข้อความไม่สำเร็จ: " + err);

        showToast("คัดลอกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

    }

}

const WARRANTY_DAYS = 60; // ค่าเริ่มต้น ถ้ายังไม่เคยตั้งค่าไว้

//------------------------------------------
// ตั้งค่าระบบ (ดึงจาก backend ตอนเปิดแอป)
//------------------------------------------

const THEME_PRESETS = {

    orange: {
        label: "ส้ม-เหลือง",
        primary: "#C45F3F",
        primaryHover: "#A84F33",
        yellow: "#F4D242",
        pink: "#F29CC3",
        blue: "#80B0E8"
    },

    blue: {
        label: "ฟ้า-ม่วง",
        primary: "#6C63D6",
        primaryHover: "#564FBD",
        yellow: "#FFD166",
        pink: "#C8A2E8",
        blue: "#7EC8E3"
    },

    green: {
        label: "เขียว-มินท์",
        primary: "#3E9B6F",
        primaryHover: "#2F7D57",
        yellow: "#F4D242",
        pink: "#F2A6C4",
        blue: "#8FD9C4"
    },

    red: {
        label: "แดง-ทอง",
        primary: "#D64550",
        primaryHover: "#B8323C",
        yellow: "#F2C14E",
        pink: "#F2A0A0",
        blue: "#88B8E8"
    }

};

function applyTheme(themeId){

    const theme = THEME_PRESETS[themeId] || THEME_PRESETS.orange;

    const root = document.documentElement.style;

    root.setProperty("--primary", theme.primary);

    root.setProperty("--primary-hover", theme.primaryHover);

    root.setProperty("--yellow", theme.yellow);

    root.setProperty("--pink", theme.pink);

    root.setProperty("--blue", theme.blue);

}

let appSettings = {

    notifyEmail: "",

    appointmentDuration: 2,

    warrantyDays: WARRANTY_DAYS,

    themeId: "orange",

    couponTier2Percent: 10,

    couponTier3Percent: 15,

    couponTier5Percent: 30

};

async function loadAppSettings(){

    try{

        const { data, error } = await supabaseClient

            .from("app_settings")

            .select("*")

            .eq("id", 1)

            .single();

        if(error) throw error;

        appSettings = {

            notifyEmail: data.notify_email || "",

            appointmentDuration: Number(data.appointment_duration) || 2,

            warrantyDays: Number(data.warranty_days) || WARRANTY_DAYS,

            themeId: data.theme_id || "orange",

            couponTier2Percent: Number(data.coupon_tier2_percent) || 10,

            couponTier3Percent: Number(data.coupon_tier3_percent) || 15,

            couponTier5Percent: Number(data.coupon_tier5_percent) || 30

        };

        applyTheme(appSettings.themeId);

        // อัปเดต % ส่วนลดคูปองสะสม (ครั้งที่ 2/3/5) ตามค่าที่ตั้งไว้ในหน้าตั้งค่า
        COUPON_TIERS[2].value = appSettings.couponTier2Percent;
        COUPON_TIERS[2].title = `ส่วนลด ${appSettings.couponTier2Percent}%`;

        COUPON_TIERS[3].value = appSettings.couponTier3Percent;
        COUPON_TIERS[3].title = `ส่วนลด ${appSettings.couponTier3Percent}%`;

        COUPON_TIERS[5].value = appSettings.couponTier5Percent;
        COUPON_TIERS[5].title = `ส่วนลด ${appSettings.couponTier5Percent}%`;

    }catch(error){

        console.error("โหลดการตั้งค่าไม่สำเร็จ ใช้ค่าเริ่มต้นแทน", error);

    }

}

// เช็คสถานะประกันหลังสัก (นับจากวันที่กดเปลี่ยนสถานะเป็น "เสร็จสิ้น")
// คืนค่า null ถ้ายังไม่เสร็จสิ้น / ไม่มีวันที่บันทึกไว้
function getWarrantyStatus(booking){

    if(booking["สถานะ"] !== "เสร็จสิ้น") return null;

    const completedDate = booking["วันที่เสร็จสิ้น"];

    if(!completedDate) return null;

    const start = new Date(completedDate);

    if(isNaN(start)) return null;

    start.setHours(0,0,0,0);

    const today = new Date();

    today.setHours(0,0,0,0);

    const daysPassed = Math.floor((today - start) / (1000 * 60 * 60 * 24));

    const daysLeft = appSettings.warrantyDays - daysPassed;

    if(daysLeft >= 0){

        return {

            inWarranty: true,

            label: `อยู่ในประกัน (เหลือ ${daysLeft} วัน)`

        };

    }else{

        return {

            inWarranty: false,

            label: `หมดประกันแล้ว (เกิน ${Math.abs(daysLeft)} วัน)`

        };

    }

}

//------------------------------------------
// รูปผลงาน (Google Drive)
//------------------------------------------

function renderPhotoGallery(customer){

    const gallery = document.getElementById("photoGallery");

    if(!gallery) return;

    const raw = customer["รูปผลงาน"] || "";

    const urls = String(raw).split(",").map(u=>u.trim()).filter(Boolean);

    if(urls.length === 0){

        gallery.innerHTML = `<p class="photo-empty">ยังไม่มีรูปผลงานแนบไว้</p>`;

        return;

    }

    gallery.innerHTML = urls.map(url=>{

        // URL จาก Supabase Storage ใช้ได้ตรงๆ ทั้งรูปย่อและรูปใหญ่ ไม่ต้องแปลงแบบ Google Drive แล้ว
        return `

        <div class="photo-thumb">

            <img
                src="${url}"
                alt="รูปผลงาน"
                loading="lazy"
                onclick="openImageLightbox('${url}')">

            <button class="photo-delete-btn" onclick="deletePhotoFromBooking('${customer["ID"]}', '${url}')" title="ลบรูปนี้">
                <i class="fa-solid fa-trash"></i>
            </button>

        </div>

        `;

    }).join("");

}

//------------------------------------------
// Lightbox - ดูรูปขยายใหญ่ในหน้าเดียวกัน ไม่ต้องเปิดแท็บใหม่
//------------------------------------------

function openImageLightbox(src){

    const oldBox = document.getElementById("imageLightbox");

    if(oldBox) oldBox.remove();

    const box = document.createElement("div");

    box.id = "imageLightbox";

    box.className = "lightbox-overlay";

    box.innerHTML = `

        <button class="lightbox-close" onclick="document.getElementById('imageLightbox').remove()">
            <i class="fa-solid fa-xmark"></i>
        </button>

        <img src="${src}" alt="รูปผลงานขยายใหญ่" class="lightbox-img">

    `;

    box.addEventListener("click", function(e){

        if(e.target === box) box.remove(); // คลิกพื้นหลังเพื่อปิด

    });

    document.body.appendChild(box);

}

function compressImage(file, maxWidth, quality){

    return new Promise((resolve, reject)=>{

        const reader = new FileReader();

        reader.onload = function(e){

            const img = new Image();

            img.onload = function(){

                let width = img.width;

                let height = img.height;

                if(width > maxWidth){

                    height = height * (maxWidth / width);

                    width = maxWidth;

                }

                const canvas = document.createElement("canvas");

                canvas.width = width;

                canvas.height = height;

                const ctx = canvas.getContext("2d");

                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", quality));

            };

            img.onerror = reject;

            img.src = e.target.result;

        };

        reader.onerror = reject;

        reader.readAsDataURL(file);

    });

}

async function uploadPhotoForBookingId(bookingId, file){

    try{

        const compressed = await compressImage(file, 1200, 0.8);

        const blob = await (await fetch(compressed)).blob();

        const fileName = `${bookingId}_${Date.now()}.jpg`;

        const { error: uploadError } = await supabaseClient.storage

            .from("booking-photos")

            .upload(fileName, blob, { contentType: "image/jpeg" });

        if(uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage

            .from("booking-photos")

            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // ดึงรายการรูปเดิมของคิวนี้มาต่อท้าย แล้วบันทึกกลับเข้า Supabase
        const { data: bookingRow, error: fetchError } = await supabaseClient

            .from("bookings")

            .select("photos")

            .eq("id", bookingId)

            .single();

        if(fetchError) throw fetchError;

        const existing = bookingRow.photos || "";

        const newList = existing ? existing + "," + publicUrl : publicUrl;

        const { error: updateError } = await supabaseClient

            .from("bookings")

            .update({ photos: newList })

            .eq("id", bookingId);

        if(updateError) throw updateError;

        return { success:true, url: publicUrl };

    }catch(error){

        console.error(error);

        return { success:false, message:"อัปโหลดรูปไม่สำเร็จ" };

    }

}

//------------------------------------------
// รูปที่แนบตอนสร้างคิวใหม่ (ก่อนกดบันทึก ยังไม่อัปโหลดจริง)
//------------------------------------------

function renderBookingPhotoPreview(){

    const el = document.getElementById("bookingPhotoPreview");

    if(!el) return;

    if(pendingBookingPhotos.length === 0){

        el.innerHTML = "";

        return;

    }

    el.innerHTML = pendingBookingPhotos.map((file, idx)=>`

        <div class="photo-thumb photo-thumb-pending">

            <img src="${URL.createObjectURL(file)}" alt="รูปที่เลือก">

            <button type="button" class="photo-delete-btn" onclick="removePendingBookingPhoto(${idx})" title="เอาออก">
                <i class="fa-solid fa-xmark"></i>
            </button>

        </div>

    `).join("");

}

function removePendingBookingPhoto(idx){

    pendingBookingPhotos.splice(idx, 1);

    renderBookingPhotoPreview();

}

async function handlePhotoUpload(customer, file){

    const statusEl = document.getElementById("photoUploadStatus");

    if(statusEl) statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด...`;

    const result = await uploadPhotoForBookingId(customer["ID"], file);

    if(statusEl) statusEl.innerHTML = "";

    if(result.success){

        showToast("อัปโหลดรูปสำเร็จ", "success");

        const existing = customer["รูปผลงาน"] || "";

        customer["รูปผลงาน"] = existing ? existing + "," + result.url : result.url;

        renderPhotoGallery(customer);

        refreshCurrentPageQuietly();

    }else{

        showToast(result.message || "อัปโหลดไม่สำเร็จ", "error");

    }

}

async function deletePhotoFromBooking(bookingId, url){

    if(!confirm("ต้องการลบรูปนี้ใช่หรือไม่?")) return;

    try{

        // ดึงชื่อไฟล์จริงออกจาก URL เพื่อลบไฟล์ใน Storage ด้วย
        const fileName = url.split("/").pop();

        await supabaseClient.storage.from("booking-photos").remove([fileName]);

        const { data: bookingRow, error: fetchError } = await supabaseClient

            .from("bookings")

            .select("photos")

            .eq("id", bookingId)

            .single();

        if(fetchError) throw fetchError;

        const urls = (bookingRow.photos || "").split(",").map(u=>u.trim()).filter(Boolean);

        const filtered = urls.filter(u => u !== url);

        const { error: updateError } = await supabaseClient

            .from("bookings")

            .update({ photos: filtered.join(",") })

            .eq("id", bookingId);

        if(updateError) throw updateError;

        showToast("ลบรูปแล้ว", "success");

        await renderPhotoGalleryAfterDelete(bookingId, url);

        refreshCurrentPageQuietly();

    }catch(error){

        console.error(error);

        showToast("ลบรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

    }

}

async function renderPhotoGalleryAfterDelete(bookingId, deletedUrl){

    // โหลดข้อมูลคิวล่าสุดใหม่ เพื่อให้แกลเลอรี่ตรงกับข้อมูลจริงในชีตเสมอ
    const bookings = await loadBookings();

    const fresh = bookings.find(b => b["ID"] === bookingId);

    if(fresh) renderPhotoGallery(fresh);

}

// รีเฟรชหน้าปัจจุบันเงียบๆ เบื้องหลัง (ไม่รบกวน popup ที่เปิดอยู่)
// เพื่อให้การ์ด/รายการที่จะใช้เปิด popup ครั้งถัดไป มีข้อมูลรูปภาพล่าสุดติดไปด้วย
async function refreshCurrentPageQuietly(){

    if(document.getElementById("dashboardContainer")){

        await refreshDashboard();

    }else if(document.getElementById("customerList")){

        await loadCustomer();

    }else if(document.getElementById("paymentTrackerList")){

        await showPaymentTracker();

    }

    // ถ้า popup "ดูประวัติ" เปิดค้างอยู่เบื้องหลัง ก็ต้องรีเฟรชด้วย
    // เพราะมันดึงข้อมูลแยกเป็นชุดของตัวเอง ไม่ได้ผูกกับ customerList/dashboard
    if(currentHistoryPhone && document.getElementById("historyPopup")){

        await viewCustomerHistory(currentHistoryPhone);

    }

}

function toDateInputValue(dateString){

    if(!dateString) return "";

    const date = new Date(dateString);

    if(isNaN(date)) return "";

    const yyyy = date.getFullYear();

    const mm = String(date.getMonth()+1).padStart(2,"0");

    const dd = String(date.getDate()).padStart(2,"0");

    return `${yyyy}-${mm}-${dd}`;

}
function escapeAttr(text){

    return String(text || "")

        .replace(/&/g, "&amp;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#39;");

}

async function refreshDashboard(){

    const bookings = await loadBookings();

    const container = document.getElementById("dashboardContainer");

    if(!container) return; // ผู้ใช้เปลี่ยนหน้าไปแล้วก่อนโหลดเสร็จ ไม่ต้องทำอะไรต่อ

    if(bookings.length === 0){

        container.innerHTML = `
            <div class="empty-card">
                <img src="images/Tiger4.png" alt="" class="empty-tiger">
                ไม่มีข้อมูลคิว
            </div>
        `;

        return;

    }

    //------------------------------------------
    //------------------------------------------
    // กรองเอาเฉพาะคิว "วันนี้เป็นต้นไป" และยังไม่จบสถานะ มาแสดงเป็นการ์ดรายวัน
    // (สรุปรายได้เดือนนี้ยังคำนวณจากคิวทั้งเดือนตามปกติ รวมของที่ผ่านมาแล้ว/เสร็จสิ้นแล้ว)
    //------------------------------------------

    const todayStart = new Date();

    todayStart.setHours(0,0,0,0);

    const upcomingBookings = bookings.filter(booking=>{

        if(booking["สถานะ"] === "เสร็จสิ้น" || booking["สถานะ"] === "ยกเลิก") return false;

        const d = new Date(booking["วันที่นัด"]);

        if(isNaN(d)) return false;

        d.setHours(0,0,0,0);

        return d.getTime() >= todayStart.getTime();

    });

    if(upcomingBookings.length === 0){

        container.innerHTML = renderDashboardStats(bookings) + `
            <div class="empty-card">
                <img src="images/Tiger4.png" alt="" class="empty-tiger">
                ไม่มีคิวที่จะถึง
            </div>
        `;

        startDashboardCountdown();

        return;

    }

    //------------------------------------------
    // ดึงข้อมูลคูปองที่ใช้ไปแล้ว มาจับคู่กับคิว เพื่อโชว์ป้ายบนการ์ด
    //------------------------------------------

    let couponMap = {};

    try{

        const bookingIds = upcomingBookings.map(b => b["ID"]);

        const { data: redemptions } = await supabaseClient

            .from("coupon_redemptions")

            .select("booking_id, tier_number")

            .in("booking_id", bookingIds);

        (redemptions || []).forEach(r => {

            couponMap[r.booking_id] = r.tier_number;

        });

    }catch(error){

        console.error("โหลดข้อมูลคูปองไม่สำเร็จ", error);

    }

    //------------------------------------------
    // จัดกลุ่มตามวันที่
    //------------------------------------------

    const groups = {};

    upcomingBookings.forEach(booking => {

        const date = booking["วันที่นัด"];

        if(!groups[date]){

            groups[date] = [];

        }

        groups[date].push(booking);

    });

    //------------------------------------------
    // สร้างการ์ดสรุป (คิวถัดไป / รายได้เดือนนี้)
    //------------------------------------------

    let html = renderDashboardStats(bookings);

    html += `<div class="section-label"><i class="fa-solid fa-list"></i> คิวที่จะถึง</div>`;

    //------------------------------------------
    // สร้างการ์ดรายวัน (เรียงตามวันที่ใกล้สุดก่อน)
    //------------------------------------------

    Object.keys(groups).sort((a,b)=> new Date(a) - new Date(b)).forEach(date => {

        const dayBookings = groups[date];

        dayBookings.sort((a,b)=>{

            return new Date(a["เวลานัด"]) - new Date(b["เวลานัด"]);

        });

        let queueHTML = "";

        dayBookings.forEach(booking => {

            const couponTier = couponMap[booking["ID"]];

            const couponBadge = couponTier
                ? `<span class="queue-coupon-badge"><i class="fa-solid fa-ticket"></i> ${COUPON_TIERS[couponTier] ? COUPON_TIERS[couponTier].title : "ครั้งที่ " + couponTier}</span>`
                : "";

            const specialBadge = booking["ส่วนลดพิเศษ%"]
                ? `<span class="queue-special-badge"><i class="fa-solid fa-percent"></i> ลดพิเศษ ${booking["ส่วนลดพิเศษ%"]}%</span>`
                : "";

            queueHTML += `

            <div class="queue-item" onclick="showQueueInfoPopup(this)"
                data-name="${escapeAttr(booking["ชื่อ"])}"
                data-phone="${escapeAttr(booking["เบอร์โทร"])}"
                data-social="${escapeAttr(booking["Line/IG"])}"
                data-price="${booking["ราคา"] || 0}">

                <div class="queue-card-top">

                    <div class="queue-time">

                        <i class="fa-regular fa-clock"></i>

                        ${formatTime(booking["เวลานัด"])}

                    </div>

                    <div onclick="event.stopPropagation()">

                        <select
                            class="queue-status-select"
                            data-booking-id="${booking["ID"]}"
                            data-event-id="${booking["Event ID"] || ""}"
                            data-current-status="${escapeAttr(booking["สถานะ"])}"
                            data-name="${escapeAttr(booking["ชื่อ"])}"
                            data-phone="${escapeAttr(booking["เบอร์โทร"])}"
                            data-detail="${escapeAttr(booking["รายละเอียด"])}"
                            data-price="${booking["ราคา"] || 0}"
                            onchange="handleStatusChange(this)">

                            ${getQuickStatusOptionsHTML(booking["สถานะ"])}

                        </select>

                    </div>

                </div>

                <div class="queue-card-mid">

                    <div class="queue-card-info">

                        <div class="queue-name">

                            <i class="fa-solid fa-user"></i>

                            ${booking["ชื่อ"]}

                        </div>

                        <div class="queue-card-sub">

                            <span class="queue-phone">

                                <i class="fa-solid fa-phone"></i>

                                ${formatPhone(booking["เบอร์โทร"])}

                            </span>

                            <span class="queue-social">

                                <img src="images/Lineig.png" alt="LINE/IG" class="lineig-icon lineig-icon-inline">

                                @${booking["Line/IG"]}

                            </span>

                        </div>

                        ${(couponBadge || specialBadge) ? `<div class="queue-card-badges">${couponBadge}${specialBadge}</div>` : ""}

                    </div>

                    <div class="queue-card-actions" onclick="event.stopPropagation()">

                        <button class="queue-coupon-btn" onclick="openCouponPopup('${booking["ID"]}', '${booking["เบอร์โทร"]}', '${(booking["ชื่อ"] || "").replace(/'/g, "\\'")}')" title="คูปองสะสม">
                            <i class="fa-solid fa-ticket"></i>
                        </button>

                        <button class="queue-special-btn" onclick="openSpecialDiscountPopup('${booking["ID"]}', '${(booking["ชื่อ"] || "").replace(/'/g, "\\'")}', '${booking["เบอร์โทร"]}', ${booking["ราคา"] || 0}, ${booking["ส่วนลดพิเศษ%"] || 0}, ${booking["ส่วนลดพิเศษบาท"] || 0})" title="ส่วนลดพิเศษ">
                            <i class="fa-solid fa-percent"></i>
                        </button>


                        <button class="queue-summary-btn"
                            data-name="${escapeAttr(booking["ชื่อ"])}"
                            data-phone="${escapeAttr(booking["เบอร์โทร"])}"
                            data-date="${escapeAttr(booking["วันที่นัด"])}"
                            data-time="${escapeAttr(booking["เวลานัด"])}"
                            data-detail="${escapeAttr(booking["รายละเอียด"])}"
                            data-price="${booking["ราคา"] || 0}"
                            data-deposit="${booking["มัดจำ"] || 0}"
                            onclick="copyBookingSummary(this)" title="คัดลอกข้อความยืนยันคิว">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>

                </div>

            </div>

            `;

        });

        const current = new Date();

        current.setHours(0,0,0,0);

        const bookingDate = new Date(date);

        bookingDate.setHours(0,0,0,0);

        const diffDay = Math.floor(

            (bookingDate - current) / (1000 * 60 * 60 * 24)

        );

        // แก้บั๊ก: เดิมใช้เลขวันคู่/คี่กำหนดสีการ์ด ไม่ได้สื่อถึงวันนี้/พรุ่งนี้จริงๆ
        const cardClass = diffDay === 0 ? "today" : diffDay === 1 ? "tomorrow" : "next-day";

        let title = "";

        if(diffDay === 0){

            title = "วันนี้";

        }
        else if(diffDay === 1){

            title = "พรุ่งนี้";

        }
        else{

            title = new Date(date).toLocaleDateString("th-TH",{
                day:"numeric",
                month:"short"
            });

        }

        html += `

        <div class="day-card ${cardClass}">

            <div class="day-left">

                <div class="day-title">

                    ${title}

                </div>

                ${diffDay <= 1 ? `

                <div class="day-number">

                    ${new Date(date).getDate()}

                </div>

                ` : ``}

            </div>

            <div class="day-right">

                <div class="card-header">

                    <h2>

                        มี ${dayBookings.length} คิว

                    </h2>

                </div>

                <div class="queue-list">

                    ${queueHTML}

                </div>

            </div>

        </div>

        `;

    });

    container.innerHTML = html;

    startDashboardCountdown();

}
function formatPhone(phone){

    const text = String(phone);

    if(text.length !== 10){

        return text;

    }

    return `${text.slice(0,3)}-${text.slice(3,6)}-${text.slice(6)}`;

}

//------------------------------------------
// สรุปรายได้เดือนนี้ + หาคิวถัดไป (ใช้ใน Dashboard)
//------------------------------------------

// คำนวณรายได้ของคิว 1 รายการ ตามกฎ:
// - ยังไม่มัดจำ      -> 0 (ยังไม่ได้รับเงิน)
// - มัดจำแล้ว/ชำระทั้งหมด -> นับค่ามัดจำที่ได้รับมาแล้ว
// - ยกเลิก           -> นับค่ามัดจำเหมือนเดิม (ไม่คืนเงินมัดจำ)
// - เสร็จสิ้น         -> นับเต็มราคา (ได้รับเงินครบแล้ว)
function calculateBookingRevenue(booking){

    const status = booking["สถานะ"];

    const price = Number(booking["ราคา"]) || 0;

    const deposit = Number(booking["มัดจำ"]) || 0;

    if(status === "เสร็จสิ้น") return price;

    if(status === "ยกเลิก") return deposit;

    if(status === "มัดจำแล้ว" || status === "ชำระทั้งหมด") return deposit;

    return 0; // ยังไม่มัดจำ

}

function computeMonthlyRevenue(bookings){

    const now = new Date();

    const year = now.getFullYear();

    const month = now.getMonth();

    let total = 0;

    bookings.forEach(booking=>{

        const d = new Date(booking["วันที่นัด"]);

        if(isNaN(d)) return;

        if(d.getFullYear() === year && d.getMonth() === month){

            total += calculateBookingRevenue(booking);

        }

    });

    return total;

}

function buildLocalDateTime(dateVal, timeStr){

    const d = new Date(dateVal);

    if(isNaN(d)) return null;

    const parts = String(timeStr).split(":");

    const hh = Number(parts[0]);

    const mm = Number(parts[1]);

    if(isNaN(hh) || isNaN(mm)) return null;

    d.setHours(hh, mm, 0, 0);

    return d;

}

function findNextBooking(bookings){

    const now = Date.now();

    const upcoming = bookings

        .filter(b => b["สถานะ"] !== "ยกเลิก" && b["สถานะ"] !== "เสร็จสิ้น")

        .map(b => ({ booking:b, dt: buildLocalDateTime(b["วันที่นัด"], formatTime(b["เวลานัด"])) }))

        .filter(x => x.dt && x.dt.getTime() >= now)

        .sort((a,b) => a.dt - b.dt);

    return upcoming.length ? upcoming[0] : null;

}

function renderDashboardStats(bookings){

    const totalRevenue = computeMonthlyRevenue(bookings);

    const next = findNextBooking(bookings);

    dashboardCountdownTarget = next ? next.dt : null;

    const monthNames = [
        "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
        "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
    ];

    const now = new Date();

    const monthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear() + 543}`;

    return `

    <div class="dashboard-stats">

        <div class="stat-card countdown-card">


            <div class="stat-icon"><i class="fa-solid fa-hourglass-half"></i></div>

            <div class="stat-body">

                <div class="stat-label">คิวถัดไป</div>

                ${next ? `

                <div class="stat-main" id="dashboardCountdownText">กำลังคำนวณ...</div>

                <div class="stat-sub">${next.booking["ชื่อ"]} · ${formatTime(next.booking["เวลานัด"])} น.</div>

                ` : `

                <div class="stat-main">ไม่มีคิวที่จะถึง</div>

                `}

            </div>

        </div>

        <div class="stat-card revenue-card">


            <div class="stat-icon"><i class="fa-solid fa-sack-dollar"></i></div>

            <div class="stat-body">

                <div class="stat-label">รายได้เดือน ${monthLabel}</div>

                <div class="stat-main">${totalRevenue.toLocaleString("th-TH")} บาท</div>

                <div class="stat-sub">นับจากคิวที่มัดจำ/ชำระ/เสร็จสิ้นแล้ว</div>

            </div>

        </div>

    </div>

    `;

}

function startDashboardCountdown(){

    if(dashboardCountdownInterval){

        clearInterval(dashboardCountdownInterval);

        dashboardCountdownInterval = null;

    }

    if(!dashboardCountdownTarget) return;

    function tick(){

        const el = document.getElementById("dashboardCountdownText");

        if(!el){

            // ผู้ใช้เปลี่ยนหน้าไปแล้ว เลิกนับต่อ
            clearInterval(dashboardCountdownInterval);

            dashboardCountdownInterval = null;

            return;

        }

        const diff = dashboardCountdownTarget.getTime() - Date.now();

        if(diff <= 0){

            el.textContent = "ถึงเวลาคิวแล้ว!";

            clearInterval(dashboardCountdownInterval);

            dashboardCountdownInterval = null;

            return;

        }

        const totalMinutes = Math.floor(diff / 60000);

        const days = Math.floor(totalMinutes / (60 * 24));

        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);

        const minutes = totalMinutes % 60;

        let text = "อีก ";

        if(days > 0) text += `${days} วัน `;

        text += `${hours} ชม. ${minutes} นาที`;

        el.textContent = text;

    }

    tick();

    dashboardCountdownInterval = setInterval(tick, 30 * 1000);

}

//------------------------------------------
// เปลี่ยนสถานะไวจาก Dashboard
//------------------------------------------

function showQueueInfoPopup(cardEl){

    const oldPopup = document.getElementById("queueInfoPopup");

    if(oldPopup) oldPopup.remove();

    const name = cardEl.dataset.name;

    const phone = cardEl.dataset.phone;

    const social = cardEl.dataset.social;

    const price = cardEl.dataset.price;

    const popup = document.createElement("div");

    popup.id = "queueInfoPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:420px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon" style="background:var(--blue);">
                            <i class="fa-solid fa-user"></i>
                        </div>

                        <div>
                            <h2>ข้อมูลลูกค้า</h2>
                            <p>${name}</p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('queueInfoPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body" style="padding:24px;">

                    <div style="margin-bottom:8px;"><strong>ชื่อ:</strong> ${name}</div>
                    <div style="margin-bottom:8px;"><strong>เบอร์โทร:</strong> ${formatPhone(phone)}</div>
                    <div style="margin-bottom:8px;"><strong>LINE/IG:</strong> @${social}</div>
                    <div><strong>ราคาประเมิน:</strong> ${Number(price).toLocaleString("th-TH")} บาท</div>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

}

function handleStatusChange(selectEl){

    const newStatus = selectEl.value;

    if(newStatus === "เสร็จสิ้น"){

        showCompleteConfirmPopup(selectEl);

    }else if(newStatus === "ยกเลิก"){

        showCancelConfirmPopup(selectEl);

    }else{

        const bookingId = selectEl.dataset.bookingId;

        const eventId = selectEl.dataset.eventId;

        selectEl.dataset.currentStatus = newStatus;

        updateBookingStatus(bookingId, newStatus, selectEl, eventId);

    }

}

function showCompleteConfirmPopup(selectEl){

    const oldPopup = document.getElementById("completeConfirmPopup");

    if(oldPopup) oldPopup.remove();

    const bookingId = selectEl.dataset.bookingId;

    const eventId = selectEl.dataset.eventId;

    const previousStatus = selectEl.dataset.currentStatus;

    const name = selectEl.dataset.name;

    const phone = selectEl.dataset.phone;

    const detail = selectEl.dataset.detail;

    const price = selectEl.dataset.price;

    const popup = document.createElement("div");

    popup.id = "completeConfirmPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:420px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon" style="background:var(--green);">
                            <i class="fa-solid fa-circle-check"></i>
                        </div>

                        <div>
                            <h2>ยืนยันคิวเสร็จสิ้น</h2>
                            <p>ตรวจสอบข้อมูลก่อนบันทึก</p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        id="completeConfirmCloseBtn">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body" style="padding:24px;">

                    <div style="margin-bottom:8px;"><strong>ชื่อ:</strong> ${name}</div>
                    <div style="margin-bottom:8px;"><strong>เบอร์โทร:</strong> ${formatPhone(phone)}</div>
                    <div style="margin-bottom:8px;"><strong>รายละเอียด:</strong> ${detail || "-"}</div>
                    <div style="margin-bottom:20px;"><strong>ราคาประเมิน:</strong> ${Number(price).toLocaleString("th-TH")} บาท</div>

                    <button class="save-btn" id="confirmCompleteBtn">
                        <i class="fa-solid fa-check"></i> ยืนยันเสร็จสิ้น
                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    function revertAndClose(){

        selectEl.value = previousStatus;

        popup.remove();

    }

    document.getElementById("completeConfirmCloseBtn").addEventListener("click", revertAndClose);

    document.getElementById("confirmCompleteBtn").addEventListener("click", function(){

        popup.remove();

        selectEl.dataset.currentStatus = "เสร็จสิ้น";

        updateBookingStatus(bookingId, "เสร็จสิ้น", selectEl, eventId);

    });

}

function showCancelConfirmPopup(selectEl){

    const oldPopup = document.getElementById("cancelConfirmPopup");

    if(oldPopup) oldPopup.remove();

    const bookingId = selectEl.dataset.bookingId;

    const eventId = selectEl.dataset.eventId;

    const previousStatus = selectEl.dataset.currentStatus;

    const name = selectEl.dataset.name;

    const popup = document.createElement("div");

    popup.id = "cancelConfirmPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:420px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon">
                            <i class="fa-solid fa-ban"></i>
                        </div>

                        <div>
                            <h2>ยืนยันการยกเลิกคิว</h2>
                            <p>${name || ""}</p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        id="cancelConfirmCloseBtn">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body">

                    <img src="images/Tiger3.png" alt="" class="confirm-tiger">

                    <p style="font-size:15px;line-height:1.7;color:#000000;text-align:center;">
                        ยืนยันจะยกเลิกคิวนี้ใช่หรือไม่คะ?
                    </p>

                </div>

                <div class="view-customer-footer two-buttons">

                    <button
                        class="view-customer-close-btn view-customer-btn-outline"
                        id="cancelConfirmBackBtn">

                        <i class="fa-solid fa-xmark"></i>
                        ไม่ยกเลิก

                    </button>

                    <button
                        class="view-customer-close-btn view-customer-btn-danger"
                        id="confirmCancelBtn">

                        <i class="fa-solid fa-ban"></i>
                        ยืนยันยกเลิก

                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    function revertAndClose(){

        selectEl.value = previousStatus;

        popup.remove();

    }

    document.getElementById("cancelConfirmCloseBtn").addEventListener("click", revertAndClose);

    document.getElementById("cancelConfirmBackBtn").addEventListener("click", revertAndClose);

    document.getElementById("confirmCancelBtn").addEventListener("click", function(){

        popup.remove();

        selectEl.dataset.currentStatus = "ยกเลิก";

        updateBookingStatus(bookingId, "ยกเลิก", selectEl, eventId);

    });

}

function updateBookingStatus(id, status, selectEl, eventId){

    if(selectEl) selectEl.disabled = true;

    const row = { status: status };

    // ย้าย logic การนับวันเริ่มประกันมาไว้ฝั่งเว็บแทน (เดิมอยู่ใน Code.gs)
    if(status === "เสร็จสิ้น"){

        row.completed_date = toDateInputValue(new Date());

    }else{

        row.completed_date = null;

    }

    supabaseClient

        .from("bookings")

        .update(row)

        .eq("id", id)

        .select()

        .single()

        .then(async ({ data:updatedRow, error })=>{

        if(!error){

            showToast("เปลี่ยนสถานะสำเร็จ", "success");

            // อัปเดตรายละเอียดใน Calendar event ให้ตรงกับสถานะล่าสุดด้วย
            // (ส่งแค่ id ไป Apps Script จะไปดึงข้อมูลเต็มจาก Supabase เองแทน)
            if(eventId && updatedRow){

                syncCalendar("updateStatus", eventId, updatedRow.id);

            }

            // ถ้ายังอยู่หน้า Dashboard ให้รีเฟรชทันที คิวที่เสร็จสิ้น/ยกเลิกจะได้หายไปจากลิสต์เลย
            if(document.getElementById("dashboardContainer")){

                await refreshDashboard();

            }

        }else{

            console.error(error);

            showToast(error.message || "เปลี่ยนสถานะไม่สำเร็จ", "error");

        }

    })
    .catch(error=>{

        console.error(error);

        showToast("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

    })
    .finally(()=>{

        if(selectEl) selectEl.disabled = false;

    });

}
//------------------------------------------
// เพิ่มคิวลูกค้าเดิม (ไม่ต้องกรอกข้อมูลลูกค้าใหม่)
//------------------------------------------

function reuseBooking(customer){

    const oldPopup = document.getElementById("reuseBookingPopup");

    if(oldPopup){
        oldPopup.remove();
    }

    const popup = document.createElement("div");

    popup.id = "reuseBookingPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon">
                            <i class="fa-solid fa-calendar-plus"></i>
                        </div>

                        <div>
                            <h2>เพิ่มคิวลูกค้าเดิม</h2>
                            <p>ใช้ข้อมูลลูกค้าเดิม ไม่ต้องกรอกใหม่</p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('reuseBookingPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body">

                    <div class="view-info-box">

                        <div class="view-info-icon view-info-icon-name">
                            <i class="fa-solid fa-user"></i>
                        </div>

                        <div class="view-info-content">
                            <span>ลูกค้า</span>
                            <strong id="reuseCustomerName"></strong>
                        </div>

                    </div>

                    <div class="view-info-box">

                        <div class="view-info-icon view-info-icon-phone">
                            <i class="fa-solid fa-phone"></i>
                        </div>

                        <div class="view-info-content">
                            <span>เบอร์โทร</span>
                            <strong id="reuseCustomerPhone"></strong>
                        </div>

                    </div>

                    <div class="view-info-box">

                        <div class="view-info-icon view-info-icon-social">
                            <img src="images/Lineig.png" alt="LINE/IG" class="lineig-icon">
                        </div>

                        <div class="view-info-content">
                            <span>LINE / IG</span>
                            <strong id="reuseCustomerSocial"></strong>
                        </div>

                    </div>

                    <div class="brand-field-grid">

                        <div class="brand-field">
                            <label>วันที่นัด *</label>
                            <input type="date" id="reuseDate">
                        </div>

                        <div class="brand-field">
                            <label>เวลานัด *</label>
                            <select id="reuseTime">${getTimeOptionsHTML()}</select>
                        </div>

                    </div>

                    <div class="brand-field-grid">

                        <div class="brand-field">
                            <label>ราคาประเมิน (บาท)</label>
                            <input type="number" id="reusePrice" placeholder="0">
                        </div>

                        <div class="brand-field">
                            <label>มัดจำ (บาท)</label>
                            <input type="number" id="reuseDeposit" placeholder="0">
                        </div>

                    </div>

                    <div class="brand-field">

                        <label>สถานะการชำระ</label>

                        <select id="reuseStatus">${getBookingStatusOptionsHTML("ยังไม่มัดจำ")}</select>

                    </div>

                    <div class="brand-field">

                        <label>รายละเอียดงาน</label>

                        <textarea
                            id="reuseDetail"
                            placeholder="รายละเอียดงานสัก / ขนาด / ตำแหน่ง / หมายเหตุ"></textarea>

                    </div>

                    <div class="brand-field">

                        <label>โน้ตเกี่ยวกับลูกค้า</label>

                        <textarea
                            id="reuseNote"
                            placeholder="เช่น แพ้อะไร ชอบสไตล์ไหน นัดยาก/ง่าย ฯลฯ (ไม่บังคับ)"></textarea>

                    </div>

                </div>

                <div class="view-customer-footer two-buttons">

                    <button
                        class="view-customer-close-btn view-customer-btn-outline"
                        onclick="document.getElementById('reuseBookingPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>
                        ยกเลิก

                    </button>

                    <button
                        class="view-customer-close-btn"
                        id="reuseSaveBtn">

                        <i class="fa-solid fa-calendar-check"></i>
                        เพิ่มคิว

                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    document.getElementById("reuseCustomerName").textContent = customer["ชื่อ"] || "-";

    document.getElementById("reuseCustomerPhone").textContent = formatPhone(customer["เบอร์โทร"]) || "-";

    document.getElementById("reuseCustomerSocial").textContent = customer["Line/IG"] ? `@${customer["Line/IG"]}` : "-";

    document.getElementById("reuseNote").value = customer["โน้ต"] || "";

    document.getElementById("reuseSaveBtn").addEventListener("click", function(){

        submitReuseBooking(customer, this);

    });

}

async function submitReuseBooking(customer, btn){

    const bookingData = {

        name: customer["ชื่อ"] || "",

        phone: String(customer["เบอร์โทร"] || ""),

        contact: customer["Line/IG"] || "",

        date: document.getElementById("reuseDate").value,

        time: document.getElementById("reuseTime").value,

        price: document.getElementById("reusePrice").value,

        deposit: document.getElementById("reuseDeposit").value,

        status: document.getElementById("reuseStatus").value,

        detail: document.getElementById("reuseDetail").value.trim(),

        note: document.getElementById("reuseNote").value.trim()

    };

    function resetBtn(){

        btn.disabled = false;

        btn.innerHTML = `
            <i class="fa-solid fa-calendar-check"></i>
            เพิ่มคิว
        `;

    }

    await submitNewBooking(bookingData, btn, resetBtn, async ()=>{

        showToast("เพิ่มคิวสำเร็จ", "success");

        const popup = document.getElementById("reuseBookingPopup");

        if(popup) popup.remove();

        await loadCustomer();

    });

}

// จัดกลุ่มคิวทั้งหมดตามเบอร์โทร ให้เหลือ 1 กลุ่มต่อลูกค้า 1 คน
// เรียงแต่ละกลุ่มเอง (ล่าสุดไปเก่าสุด) และเรียงกลุ่มตามคนที่มาล่าสุดก่อน
function groupCustomersByPhone(bookings){

    const groups = {};

    bookings.forEach(b=>{

        const phone = b["เบอร์โทร"];

        if(!groups[phone]){
            groups[phone] = [];
        }

        groups[phone].push(b);

    });

    return Object.values(groups)

        .map(visits=>{

            visits.sort((a,b)=> new Date(b["วันที่นัด"]) - new Date(a["วันที่นัด"]));

            return {

                phone: visits[0]["เบอร์โทร"],
                latest: visits[0],
                visits: visits,
                count: visits.length

            };

        })

        .sort((a,b)=> new Date(b.latest["วันที่นัด"]) - new Date(a.latest["วันที่นัด"]));

}

function renderCustomerCard(group){

    const latest = group.latest;

    const latestJSON = JSON.stringify(latest).replace(/"/g,'&quot;');

    const isRegular = group.count >= 3;

    return `

    <div class="customer-card">

        <div class="customer-card-header">

            <h3>${latest["ชื่อ"]}</h3>

            ${isRegular ? `<span class="regular-badge"><i class="fa-solid fa-star"></i> ลูกค้าประจำ</span>` : ``}

        </div>

        <p>${formatPhone(latest["เบอร์โทร"])}</p>

        <p>@${latest["Line/IG"]}</p>

        <p class="visit-count">

            <i class="fa-solid fa-clock-rotate-left"></i>

            มาแล้ว ${group.count} ครั้ง

        </p>

        <div class="customer-card-actions">

            <button
                class="view-btn"
                onclick="viewCustomerHistory('${group.phone}')">

                <i class="fa-solid fa-clock-rotate-left"></i>
                ดูประวัติ

            </button>

            <button
                class="reuse-btn"
                onclick="reuseBooking(${latestJSON})">

                <i class="fa-solid fa-calendar-plus"></i>
                เพิ่มคิว

            </button>

            <button
                class="edit-btn"
                onclick="editCustomer(${latestJSON})">

                <i class="fa-solid fa-pen"></i>
                แก้ไข

            </button>

            <button
                class="coupon-check-btn"
                onclick="openCouponViewPopup('${group.phone}', '${(latest["ชื่อ"] || "").replace(/'/g, "\\'")}')">

                <i class="fa-solid fa-ticket"></i>
                คูปอง

            </button>

        </div>

    </div>

    `;

}

async function loadCustomer(initialSearch){

    const bookings = await loadBookings();

    const customerList = document.getElementById("customerList");

    const groups = groupCustomersByPhone(bookings);

    function renderList(list, emptyImg, emptyText){

        customerList.innerHTML = list.length

            ? list.map(renderCustomerCard).join("")

            : `
                <div class="empty-card">
                    <img src="images/${emptyImg}" alt="" class="empty-tiger">
                    ${emptyText}
                </div>
            `;

    }

    function applyFilter(keyword){

        const kw = keyword.toLowerCase();

        if(!kw){

            renderList(groups, "Tiger4.png", "ยังไม่มีข้อมูลลูกค้า");

            return;

        }

        const filteredGroups = groups.filter(group => {

            const latest = group.latest;

            return (

                latest["ชื่อ"].toLowerCase().includes(kw)

                ||

                String(latest["เบอร์โทร"]).includes(kw)

                ||

                latest["Line/IG"].toLowerCase().includes(kw)

            );

        });

        renderList(filteredGroups, "Tiger2.png", "ไม่พบลูกค้าที่ค้นหา");

    }

    applyFilter(initialSearch || "");

    console.log("โหลดลูกค้าเสร็จ");

    const searchInput = document.getElementById("searchCustomer");

    searchInput.addEventListener("input", function(){

        applyFilter(this.value);

    });

}

//------------------------------------------
// ดูประวัติลูกค้าทั้งหมด (รวมทุกครั้งที่เคยมา)
//------------------------------------------

let currentHistoryPhone = null;

async function viewCustomerHistory(phone){

    const bookings = await loadBookings();

    const visits = bookings

        .filter(b => b["เบอร์โทร"] === phone)

        .sort((a,b)=> new Date(b["วันที่นัด"]) - new Date(a["วันที่นัด"]));

    if(visits.length === 0){

        showToast("ไม่พบประวัติลูกค้า", "warning");

        return;

    }

    currentHistoryPhone = phone;

    const latest = visits[0];

    const oldPopup = document.getElementById("historyPopup");

    if(oldPopup) oldPopup.remove();

    let listHTML = "";

    visits.forEach(v=>{

        const vJSON = JSON.stringify(v).replace(/"/g,'&quot;');

        const warranty = getWarrantyStatus(v);

        listHTML += `

        <div class="history-item">

            <div class="history-item-main" onclick="viewCustomer(${vJSON})">

                <div class="history-item-date">

                    <i class="fa-regular fa-calendar"></i>
                    ${formatDate(v["วันที่นัด"])} · ${formatTime(v["เวลานัด"])} น.

                </div>

                <div class="history-item-status-col">

                    <div class="history-item-status">${v["สถานะ"] || "-"}</div>

                    ${warranty ? `

                    <div class="warranty-badge ${warranty.inWarranty ? "warranty-in" : "warranty-out"}">

                        ${warranty.label}

                    </div>

                    ` : ``}

                </div>

            </div>

            <button
                class="history-item-delete"
                onclick="confirmDeleteCustomer(${vJSON})"
                title="ลบคิวนี้">

                <i class="fa-solid fa-trash"></i>

            </button>

        </div>

        `;

    });

    const popup = document.createElement("div");

    popup.id = "historyPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                        </div>

                        <div>
                            <h2 id="historyCustomerName"></h2>
                            <p id="historyCustomerMeta"></p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('historyPopup').remove(); currentHistoryPhone = null;">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body">

                    <div class="history-list">

                        ${listHTML}

                    </div>

                </div>

                <div class="view-customer-footer two-buttons">

                    <button
                        class="view-customer-close-btn view-customer-btn-outline"
                        onclick="document.getElementById('historyPopup').remove(); currentHistoryPhone = null;">

                        ปิด

                    </button>

                    <button
                        class="view-customer-close-btn"
                        id="historyReuseBtn">

                        <i class="fa-solid fa-calendar-plus"></i>
                        เพิ่มคิวใหม่

                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    document.getElementById("historyCustomerName").textContent = latest["ชื่อ"] || "-";

    document.getElementById("historyCustomerMeta").textContent =
        `${formatPhone(latest["เบอร์โทร"])} · มาแล้ว ${visits.length} ครั้ง`;

    document.getElementById("historyReuseBtn").addEventListener("click", function(){

        document.getElementById("historyPopup").remove();

        currentHistoryPhone = null;

        reuseBooking(latest);

    });

}

function editCustomer(customer){

    editingCustomer = customer;

    const oldPopup = document.getElementById("editCustomerPopup");

    if(oldPopup){
        oldPopup.remove();
    }

    const popup = document.createElement("div");

    popup.id = "editCustomerPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon">
                            <i class="fa-solid fa-pen"></i>
                        </div>

                        <div>
                            <h2>แก้ไขข้อมูลลูกค้า</h2>
                            <p id="editCustomerSubtitle"></p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('editCustomerPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body">

                    <div class="brand-field">
                        <label>ชื่อ-นามสกุล</label>
                        <input type="text" id="editName">
                    </div>

                    <div class="brand-field">
                        <label>เบอร์โทร</label>
                        <input type="text" id="editPhone" maxlength="10" inputmode="numeric">
                    </div>

                    <div class="brand-field">
                        <label>LINE / IG</label>
                        <input type="text" id="editSocial">
                    </div>

                    <div class="brand-field-grid">

                        <div class="brand-field">
                            <label>วันที่นัด</label>
                            <input type="date" id="editDate">
                        </div>

                        <div class="brand-field">
                            <label>เวลานัด</label>
                            <select id="editTime">${getTimeOptionsHTML()}</select>
                        </div>

                    </div>

                    <div class="brand-field">
                        <label>โน้ตเกี่ยวกับลูกค้า</label>
                        <textarea id="editNote" placeholder="เช่น แพ้อะไร ชอบสไตล์ไหน นัดยาก/ง่าย ฯลฯ (ไม่บังคับ)"></textarea>
                    </div>

                </div>

                <div class="view-customer-footer two-buttons">

                    <button
                        class="view-customer-close-btn view-customer-btn-outline"
                        onclick="document.getElementById('editCustomerPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>
                        ยกเลิก

                    </button>

                    <button
                        class="view-customer-close-btn"
                        onclick="saveCustomer()">

                        <i class="fa-solid fa-floppy-disk"></i>
                        บันทึก

                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    document.getElementById("editCustomerSubtitle").textContent = customer["ชื่อ"] || "";

    document.getElementById("editName").value = customer["ชื่อ"] || "";
    document.getElementById("editPhone").value = customer["เบอร์โทร"] || "";
    document.getElementById("editSocial").value = customer["Line/IG"] || "";
    document.getElementById("editDate").value = toDateInputValue(customer["วันที่นัด"]);
    document.getElementById("editTime").value = customer["เวลานัด"] ? formatTime(customer["เวลานัด"]) : "";
    document.getElementById("editNote").value = customer["โน้ต"] || "";

}
//------------------------------------------
// ดูรายละเอียดลูกค้า
//------------------------------------------

//------------------------------------------
// ดูรายละเอียดลูกค้า
//------------------------------------------

function viewCustomer(customer){

    const oldPopup = document.getElementById("viewCustomerPopup");

    if(oldPopup){
        oldPopup.remove();
    }

    const warranty = getWarrantyStatus(customer);

    const popup = document.createElement("div");

    popup.id = "viewCustomerPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon">
                            <i class="fa-solid fa-user"></i>
                        </div>

                        <div>
                            <h2>ข้อมูลลูกค้า</h2>
                            <p>รายละเอียดข้อมูลการนัดหมาย</p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('viewCustomerPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>


                <div class="view-customer-body">


                    <div class="view-info-box">

                        <div class="view-info-icon view-info-icon-name">
                            <i class="fa-solid fa-user"></i>
                        </div>

                        <div class="view-info-content">

                            <span>ชื่อ</span>

                            <strong>
                                ${customer["ชื่อ"] || "-"}
                            </strong>

                        </div>

                    </div>


                    <div class="view-info-box">

                        <div class="view-info-icon view-info-icon-phone">
                            <i class="fa-solid fa-phone"></i>
                        </div>

                        <div class="view-info-content">

                            <span>เบอร์โทร</span>

                            <strong>
                                ${formatPhone(customer["เบอร์โทร"]) || "-"}
                            </strong>

                        </div>

                    </div>


                    <div class="view-info-box">

                        <div class="view-info-icon view-info-icon-social">
                            <img src="images/Lineig.png" alt="LINE/IG" class="lineig-icon">
                        </div>

                        <div class="view-info-content">

                            <span>LINE / IG</span>

                            <strong>
                                ${customer["Line/IG"] || "-"}
                            </strong>

                        </div>

                    </div>


                    <div class="view-info-grid">


                        <div class="view-info-box">

                            <div class="view-info-icon view-info-icon-date">
                                <i class="fa-solid fa-calendar"></i>
                            </div>

                            <div class="view-info-content">

                                <span>วันที่นัด</span>

                                <strong>
                                    ${customer["วันที่นัด"] ? formatDate(customer["วันที่นัด"]) : "-"}
                                </strong>

                            </div>

                        </div>


                        <div class="view-info-box">

                            <div class="view-info-icon view-info-icon-time">
                                <i class="fa-regular fa-clock"></i>
                            </div>

                            <div class="view-info-content">

                                <span>เวลานัด</span>

                                <strong>
                                    ${
                                        customer["เวลานัด"]
                                        ? formatTime(customer["เวลานัด"])
                                        : "-"
                                    }
                                </strong>

                            </div>

                        </div>


                    </div>


                    <div class="view-info-grid">


                        <div class="view-info-box">

                            <div class="view-info-icon view-info-icon-price">
                                <i class="fa-solid fa-money-bill"></i>
                            </div>

                            <div class="view-info-content">

                                <span>ราคาประเมิน</span>

                                <strong>
                                    ${customer["ราคา"] || "0"} บาท
                                </strong>

                            </div>

                        </div>


                        <div class="view-info-box">

                            <div class="view-info-icon view-info-icon-deposit">
                                <i class="fa-solid fa-wallet"></i>
                            </div>

                            <div class="view-info-content">

                                <span>มัดจำ</span>

                                <strong>
                                    ${customer["มัดจำ"] || "0"} บาท
                                </strong>

                            </div>

                        </div>


                    </div>


                    <div class="view-info-box">

                        <div class="view-info-icon view-info-icon-status">
                            <i class="fa-solid fa-circle-info"></i>
                        </div>

                        <div class="view-info-content">

                            <span>สถานะ</span>

                            <strong>
                                ${customer["สถานะ"] || "-"}
                            </strong>

                        </div>

                    </div>

                    ${warranty ? `

                    <div class="warranty-box ${warranty.inWarranty ? "warranty-in" : "warranty-out"}">

                        <i class="fa-solid ${warranty.inWarranty ? "fa-shield-halved" : "fa-shield"}"></i>

                        <div class="warranty-box-content">

                            <span>สถานะประกันหลังสัก (60 วัน)</span>

                            <strong>${warranty.label}</strong>

                        </div>

                    </div>

                    ` : ``}


                    <div class="view-detail-box">

                        <div class="view-detail-title">

                            <i class="fa-solid fa-note-sticky"></i>

                            รายละเอียดงาน

                        </div>

                        <div class="view-detail-text">

                            ${customer["รายละเอียด"] || "ไม่มีรายละเอียด"}

                        </div>

                    </div>

                    ${customer["โน้ต"] ? `

                    <div class="view-detail-box view-note-box">

                        <div class="view-detail-title">

                            <i class="fa-solid fa-star"></i>

                            โน้ตเกี่ยวกับลูกค้า

                        </div>

                        <div class="view-detail-text">

                            ${customer["โน้ต"]}

                        </div>

                    </div>

                    ` : ``}

                    <div class="view-detail-box view-photo-box">

                        <div class="view-detail-title">

                            <i class="fa-solid fa-images"></i>

                            รูปผลงาน

                        </div>

                        <div class="photo-gallery" id="photoGallery"></div>

                        <label class="photo-upload-btn">

                            <i class="fa-solid fa-camera"></i>
                            อัปโหลดรูป

                            <input type="file" id="photoUploadInput" accept="image/*" style="display:none;">

                        </label>

                        <div id="photoUploadStatus"></div>

                    </div>


                </div>


                <div class="view-customer-footer">

                    <button
                        class="view-customer-close-btn"
                        onclick="document.getElementById('viewCustomerPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                        ปิด

                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    renderPhotoGallery(customer);

    document.getElementById("photoUploadInput").addEventListener("change", function(e){

        const file = e.target.files[0];

        if(file) handlePhotoUpload(customer, file);

        e.target.value = "";

    });

}
function saveCustomer(){

    const name = document.getElementById("editName").value.trim();

    const phone = document.getElementById("editPhone").value.trim();

    const social = document.getElementById("editSocial").value.trim();

    const date = document.getElementById("editDate").value;

    const time = document.getElementById("editTime").value;

    const note = document.getElementById("editNote").value.trim();

    if(name === ""){

        showToast("กรุณากรอกชื่อลูกค้า", "warning");

        return;

    }

    if(phone.length !== 10){

        showToast("เบอร์โทรต้องมี 10 หลัก", "warning");

        return;

    }

    const data = {

        name: name,

        phone: phone,

        contact: social,

        date: date,

        time: time,

        note: note

    };

    const row = mapBookingToRow(data);

    supabaseClient

        .from("bookings")

        .update(row)

        .eq("id", editingCustomer["ID"])

        .then(async ({ error })=>{

            if(!error){

                showToast("แก้ไขสำเร็จ", "success");

                const popup = document.getElementById("editCustomerPopup");

                if(popup) popup.remove();

                // sync ปฏิทิน/อีเมล ไปด้วย (ไม่บล็อกการปิด popup ถ้าจุดนี้พลาด)
                syncCalendar("update", editingCustomer["Event ID"], editingCustomer["ID"]);

                await loadCustomer();

            }else{

                console.error(error);

                showToast(error.message || "เกิดข้อผิดพลาด", "error");

            }

        });

}

//------------------------------------------
// ยืนยันการลบ (Popup แทน confirm())
//------------------------------------------

function confirmDeleteCustomer(customer){

    const oldPopup = document.getElementById("deleteConfirmPopup");

    if(oldPopup){
        oldPopup.remove();
    }

    const popup = document.createElement("div");

    popup.id = "deleteConfirmPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:420px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon">
                            <i class="fa-solid fa-trash"></i>
                        </div>

                        <div>
                            <h2>ยืนยันการลบ</h2>
                            <p id="deleteConfirmSubtitle"></p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('deleteConfirmPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body">

                    <img src="images/Tiger3.png" alt="" class="confirm-tiger">

                    <p style="font-size:15px;line-height:1.7;color:#000000;text-align:center;">
                        ต้องการลบข้อมูลลูกค้าคนนี้ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
                    </p>

                </div>

                <div class="view-customer-footer two-buttons">

                    <button
                        class="view-customer-close-btn view-customer-btn-outline"
                        onclick="document.getElementById('deleteConfirmPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>
                        ยกเลิก

                    </button>

                    <button
                        class="view-customer-close-btn view-customer-btn-danger"
                        id="confirmDeleteBtn">

                        <i class="fa-solid fa-trash"></i>
                        ลบเลย

                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    document.getElementById("deleteConfirmSubtitle").textContent = customer["ชื่อ"] || "";

    document.getElementById("confirmDeleteBtn").addEventListener("click", function(){

        deleteCustomer(customer["ID"], customer["Event ID"], this);

    });

}

function deleteCustomer(id, eventId, btnEl){

    if(btnEl){

        btnEl.disabled = true;

        btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังลบ...`;

    }

    supabaseClient

        .from("bookings")

        .delete()

        .eq("id", id)

        .then(async ({ error })=>{

        const popup = document.getElementById("deleteConfirmPopup");

        if(popup) popup.remove();

        if(!error){

            showToast("ลบสำเร็จ", "success");

            // ลบ Calendar event ทิ้งด้วย (ถ้าเคยมี)
            if(eventId){

                syncCalendar("delete", eventId, "");

            }

            await loadCustomer();

            // ถ้ากำลังเปิด popup ดูประวัติของคนนี้อยู่ ให้รีเฟรชให้เห็นผลทันที
            if(currentHistoryPhone){

                const phone = currentHistoryPhone;

                const stillHasVisits = (await loadBookings()).some(b => b["เบอร์โทร"] === phone);

                if(stillHasVisits){

                    await viewCustomerHistory(phone);

                }else{

                    const historyPopup = document.getElementById("historyPopup");

                    if(historyPopup) historyPopup.remove();

                    currentHistoryPhone = null;

                }

            }

        }else{

            console.error(error);

            showToast(error.message || "เกิดข้อผิดพลาด", "error");

        }

    })
    .catch(error=>{

        console.error(error);

        showToast("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

        if(btnEl){

            btnEl.disabled = false;

            btnEl.innerHTML = `<i class="fa-solid fa-trash"></i> ลบเลย`;

        }

    });

}
//------------------------------------------
//------------------------------------------
// คูปองสะสม (เช็คสิทธิ์ + ใช้คูปองจากหน้า Dashboard)
//------------------------------------------

const COUPON_TIERS = {
    2: { title: "ส่วนลด 10%", type: "percent", value: 10 },
    3: { title: "ส่วนลด 15%", type: "percent", value: 15 },
    4: { title: "Buy 1 Get 1 (ไม่เกิน 5×5 ซม.)", type: "bogo" },
    5: { title: "ส่วนลด 30%", type: "percent", value: 30 },
    6: { title: "Buy 1 Get 1 (ไม่เกิน 10×10 ซม.)", type: "bogo" }
};

// ส่วนลดพิเศษ (แยกจากคูปองสะสม) - แอดมินกดเลือกเองได้จากการ์ดคิว ใช้ร่วมกับคูปองสะสมได้
const SPECIAL_DISCOUNT_OPTIONS = [5, 10, 15];

function openCouponViewPopup(phone, name){

    const oldPopup = document.getElementById("couponViewPopup");

    if(oldPopup) oldPopup.remove();

    const popup = document.createElement("div");

    popup.id = "couponViewPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:460px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon" style="background:var(--yellow);">
                            <i class="fa-solid fa-ticket"></i>
                        </div>

                        <div>
                            <h2>เช็คคูปองสะสม</h2>
                            <p>${name} · ${formatPhone(phone)}</p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('couponViewPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body" id="couponViewPopupBody" style="padding:24px;">

                    <div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังเช็คสิทธิ์...</div>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    loadCouponViewState(phone);

}

async function loadCouponViewState(phone){

    const body = document.getElementById("couponViewPopupBody");

    if(!body) return;

    try{

        const { data: visits, error: visitError } = await supabaseClient

            .from("bookings")

            .select("id")

            .eq("phone", phone)

            .eq("status", "เสร็จสิ้น");

        if(visitError) throw visitError;

        const count = visits.length;

        const { data: redeemed, error: redeemError } = await supabaseClient

            .from("coupon_redemptions")

            .select("tier_number")

            .eq("phone", phone);

        if(redeemError) throw redeemError;

        const redeemedTiers = redeemed.map(r => r.tier_number);

        let html = `<div style="font-weight:700; margin-bottom:14px;">มาแล้ว ${count} ครั้ง</div>`;

        Object.keys(COUPON_TIERS).map(Number).forEach(n => {

            const tier = COUPON_TIERS[n];

            const isRedeemed = redeemedTiers.includes(n);

            const isPending = !isRedeemed && count >= n;

            let boxStyle = "background:#F2F2F2; opacity:.6;";

            let statusLabel = `<span style="color:var(--sub);">ยังไม่ถึงเกณฑ์</span>`;

            if(isRedeemed){

                boxStyle = "background:#DFF5E3; opacity:1;";

                statusLabel = `<span style="color:#1E7B34; font-weight:800;"><i class="fa-solid fa-circle-check"></i> ใช้ไปแล้ว</span>`;

            }else if(isPending){

                boxStyle = "background:var(--yellow); opacity:1;";

                statusLabel = `<span style="color:var(--primary); font-weight:800;">พร้อมใช้</span>`;

            }

            html += `

                <div style="display:flex; align-items:center; gap:10px; padding:12px 14px; border:2px solid #000; border-radius:12px; margin-bottom:8px; ${boxStyle}">
                    <span style="flex-shrink:0; background:var(--primary); color:#fff; font-size:11px; font-weight:800; padding:3px 9px; border-radius:6px;">ครั้งที่ ${n}</span>
                    <span style="flex:1; font-weight:700; font-size:14px;">${tier.title}</span>
                    ${statusLabel}
                </div>

            `;

        });

        html += `<div style="font-size:12px; color:var(--sub); text-align:center; margin-top:10px;">เป็นการเช็คสถานะเท่านั้น ถ้าจะใช้คูปองให้ไปที่หน้า Dashboard</div>`;

        body.innerHTML = html;

    }catch(error){

        console.error(error);

        body.innerHTML = `<div style="text-align:center; padding:16px; color:var(--primary); font-weight:600;">เช็คสิทธิ์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>`;

    }

}

function openCouponPopup(bookingId, phone, name){

    const oldPopup = document.getElementById("couponPopup");

    if(oldPopup) oldPopup.remove();

    const popup = document.createElement("div");

    popup.id = "couponPopup";

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:460px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon" style="background:var(--yellow);">
                            <i class="fa-solid fa-ticket"></i>
                        </div>

                        <div>
                            <h2>คูปองสะสม</h2>
                            <p>${name} · ${formatPhone(phone)}</p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('couponPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body" id="couponPopupBody" style="padding:24px;">

                    <div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบ...</div>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

    loadCouponPopupState(bookingId, phone);

}

async function loadCouponPopupState(bookingId, phone){

    const body = document.getElementById("couponPopupBody");

    if(!body) return;

    try{

        const { data, error } = await supabaseClient

            .from("coupon_redemptions")

            .select("id, tier_number, discount_amount")

            .eq("booking_id", bookingId)

            .maybeSingle();

        if(error) throw error;

        if(data){

            const tier = COUPON_TIERS[data.tier_number];

            body.innerHTML = `

                <div style="background:var(--yellow); border:2px solid #000; border-radius:12px; padding:16px; margin-bottom:16px;">
                    <div style="font-weight:800; margin-bottom:4px;"><i class="fa-solid fa-ticket"></i> คิวนี้ใช้คูปอง: ${tier ? tier.title : "ครั้งที่ " + data.tier_number}</div>
                    ${data.discount_amount > 0 ? `<div style="font-size:13px;">ส่วนลดที่ให้ไป: ${Number(data.discount_amount).toLocaleString("th-TH")} บาท</div>` : ""}
                </div>

                <button class="save-btn" style="background:var(--sub);" onclick="cancelCouponRedemption('${data.id}', '${bookingId}', ${data.discount_amount || 0})">
                    <i class="fa-solid fa-rotate-left"></i> ยกเลิกการใช้คูปองนี้
                </button>

                <div style="font-size:12px; color:var(--sub); text-align:center; margin-top:10px;">ยกเลิกแล้ว ลูกค้าจะเก็บสะสมต่อได้ตามปกติ ราคาคิวจะคืนกลับเป็นราคาก่อนหักส่วนลด</div>

            `;

        }else{

            body.innerHTML = `

                <button class="save-btn" onclick="checkCouponEligibility('${phone}', '${bookingId}')">
                    <i class="fa-solid fa-magnifying-glass"></i> เช็คสิทธิ์คูปอง
                </button>

            `;

        }

    }catch(error){

        console.error(error);

        body.innerHTML = `<div style="text-align:center; padding:16px; color:var(--primary); font-weight:600;">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>`;

    }

}

async function cancelCouponRedemption(redemptionId, bookingId, discountAmount){

    try{

        const { error: deleteError } = await supabaseClient

            .from("coupon_redemptions")

            .delete()

            .eq("id", redemptionId);

        if(deleteError) throw deleteError;

        if(discountAmount > 0){

            const { data: bookingRow, error: fetchError } = await supabaseClient

                .from("bookings")

                .select("price")

                .eq("id", bookingId)

                .single();

            if(fetchError) throw fetchError;

            const restoredPrice = (Number(bookingRow.price) || 0) + Number(discountAmount);

            const { error: updateError } = await supabaseClient

                .from("bookings")

                .update({ price: restoredPrice })

                .eq("id", bookingId);

            if(updateError) throw updateError;

        }

        showToast("ยกเลิกการใช้คูปองสำเร็จ ลูกค้าเก็บสะสมต่อได้ตามปกติ", "success");

        const popup = document.getElementById("couponPopup");

        if(popup) popup.remove();

        if(document.getElementById("dashboardContainer")){

            await refreshDashboard();

        }

    }catch(error){

        console.error(error);

        showToast("ยกเลิกคูปองไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

    }

}

async function checkCouponEligibility(phone, bookingId){

    const body = document.getElementById("couponPopupBody");

    if(!body) return;

    body.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังเช็คสิทธิ์...</div>`;

    try{

        const { data: visits, error: visitError } = await supabaseClient

            .from("bookings")

            .select("id")

            .eq("phone", phone)

            .eq("status", "เสร็จสิ้น");

        if(visitError) throw visitError;

        const count = visits.length;

        const { data: redeemed, error: redeemError } = await supabaseClient

            .from("coupon_redemptions")

            .select("tier_number")

            .eq("phone", phone);

        if(redeemError) throw redeemError;

        const redeemedTiers = redeemed.map(r => r.tier_number);

        const eligibleTiers = Object.keys(COUPON_TIERS)

            .map(Number)

            .filter(n => count >= n && !redeemedTiers.includes(n));

        if(eligibleTiers.length === 0){

            body.innerHTML = `

                <div style="text-align:center; padding:16px; color:var(--sub); font-weight:600;">
                    <i class="fa-solid fa-face-smile" style="font-size:24px; display:block; margin-bottom:10px;"></i>
                    ลูกค้าคนนี้ยังไม่มีคูปองที่ใช้ได้ตอนนี้ครับ
                    <div style="margin-top:6px; font-size:13px;">(มาแล้ว ${count} ครั้ง — คูปองที่ผ่านมาถูกใช้ไปแล้วหรือยังไม่ถึงเกณฑ์)</div>
                </div>

            `;

            return;

        }

        let html = `<div style="font-weight:700; margin-bottom:14px;">มาแล้ว ${count} ครั้ง — เลือกคูปองที่จะใช้:</div>`;

        eligibleTiers.forEach(n => {

            const tier = COUPON_TIERS[n];

            html += `

                <div class="coupon-tier-option" onclick="selectCouponTier('${bookingId}', '${phone}', ${n})">
                    <span class="coupon-tier-badge">ครั้งที่ ${n}</span>
                    <span>${tier.title}</span>
                    <i class="fa-solid fa-chevron-right"></i>
                </div>

            `;

        });

        body.innerHTML = html;

    }catch(error){

        console.error(error);

        body.innerHTML = `<div style="text-align:center; padding:16px; color:var(--primary); font-weight:600;">เช็คสิทธิ์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>`;

    }

}

function selectCouponTier(bookingId, phone, tierNumber){

    const body = document.getElementById("couponPopupBody");

    if(!body) return;

    const tier = COUPON_TIERS[tierNumber];

    if(tier.type === "percent"){

        body.innerHTML = `

            <div style="font-weight:700; margin-bottom:10px;">${tier.title} (ครั้งที่ ${tierNumber})</div>

            <label style="font-size:13px; font-weight:600; display:block; margin-bottom:6px;">ราคาเต็ม (บาท)</label>

            <input type="number" id="couponFullPrice" placeholder="เช่น 1500"
                style="width:100%; padding:10px 12px; border:2px solid #000; border-radius:10px; font-family:'Kanit',sans-serif; font-size:16px; margin-bottom:12px;"
                oninput="updateCouponCalc(${tierNumber})">

            <div id="couponCalcResult" style="font-weight:700; font-size:15px; margin-bottom:16px; min-height:24px;"></div>

            <button class="save-btn" id="couponConfirmBtn" disabled onclick="confirmCouponUse('${bookingId}', '${phone}', ${tierNumber})">
                <i class="fa-solid fa-check"></i> ยืนยันใช้คูปอง
            </button>

        `;

    }else{

        body.innerHTML = `

            <div style="font-weight:700; margin-bottom:10px;">${tier.title} (ครั้งที่ ${tierNumber})</div>

            <label style="font-size:13px; font-weight:600; display:block; margin-bottom:6px;">ราคาที่เก็บจริง (บาท)</label>

            <input type="number" id="couponFullPrice" placeholder="กรอกราคาที่คิดลูกค้าจริง"
                style="width:100%; padding:10px 12px; border:2px solid #000; border-radius:10px; font-family:'Kanit',sans-serif; font-size:16px; margin-bottom:16px;">

            <button class="save-btn" onclick="confirmCouponUse('${bookingId}', '${phone}', ${tierNumber})">
                <i class="fa-solid fa-check"></i> ยืนยันใช้คูปอง
            </button>

        `;

    }

}

function updateCouponCalc(tierNumber){

    const tier = COUPON_TIERS[tierNumber];

    const fullPrice = Number(document.getElementById("couponFullPrice").value) || 0;

    const resultEl = document.getElementById("couponCalcResult");

    const confirmBtn = document.getElementById("couponConfirmBtn");

    if(fullPrice <= 0){

        resultEl.textContent = "";

        confirmBtn.disabled = true;

        return;

    }

    const discountAmount = Math.round(fullPrice * (tier.value / 100));

    const finalPrice = fullPrice - discountAmount;

    resultEl.innerHTML = `ส่วนลด ${discountAmount.toLocaleString("th-TH")} บาท → เก็บจริง <span style="color:var(--primary);">${finalPrice.toLocaleString("th-TH")} บาท</span>`;

    confirmBtn.disabled = false;

}

async function confirmCouponUse(bookingId, phone, tierNumber){

    const tier = COUPON_TIERS[tierNumber];

    const fullPrice = Number(document.getElementById("couponFullPrice").value) || 0;

    if(fullPrice <= 0){

        showToast("กรุณากรอกราคาก่อนครับ", "error");

        return;

    }

    let finalPrice = fullPrice;

    let discountAmount = 0;

    if(tier.type === "percent"){

        discountAmount = Math.round(fullPrice * (tier.value / 100));

        finalPrice = fullPrice - discountAmount;

    }

    try{

        const { error: updateError } = await supabaseClient

            .from("bookings")

            .update({ price: finalPrice })

            .eq("id", bookingId);

        if(updateError) throw updateError;

        const { error: redeemError } = await supabaseClient

            .from("coupon_redemptions")

            .insert({

                phone: phone,

                tier_number: tierNumber,

                booking_id: bookingId,

                discount_amount: discountAmount

            });

        if(redeemError) throw redeemError;

        showToast("ใช้คูปองสำเร็จ บันทึกราคาใหม่แล้ว", "success");

        const popup = document.getElementById("couponPopup");

        if(popup) popup.remove();

        if(document.getElementById("dashboardContainer")){

            await refreshDashboard();

        }

    }catch(error){

        console.error(error);

        showToast("ใช้คูปองไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

    }

}

//------------------------------------------
// ส่วนลดพิเศษ (แยกจากคูปองสะสม)
//------------------------------------------

function openSpecialDiscountPopup(bookingId, name, phone, currentPrice, specialPercent, specialAmount){

    const oldPopup = document.getElementById("specialDiscountPopup");

    if(oldPopup) oldPopup.remove();

    const popup = document.createElement("div");

    popup.id = "specialDiscountPopup";

    const bodyHTML = specialPercent > 0

        ? `

            <div style="background:var(--green); color:#fff; border:2px solid #000; border-radius:12px; padding:16px; margin-bottom:16px;">
                <div style="font-weight:800; margin-bottom:4px;"><i class="fa-solid fa-percent"></i> คิวนี้ใช้ส่วนลดพิเศษ: ${specialPercent}%</div>
                ${specialAmount > 0 ? `<div style="font-size:13px;">ส่วนลดที่ให้ไป: ${Number(specialAmount).toLocaleString("th-TH")} บาท</div>` : ""}
            </div>

            <button class="save-btn" style="background:var(--sub);" onclick="cancelSpecialDiscount('${bookingId}', ${specialAmount || 0})">
                <i class="fa-solid fa-rotate-left"></i> ยกเลิกส่วนลดพิเศษนี้
            </button>

            <div style="font-size:12px; color:var(--sub); text-align:center; margin-top:10px;">ยกเลิกแล้ว ราคาคิวจะคืนกลับเป็นราคาก่อนหักส่วนลดพิเศษ</div>

        `

        : `

            <div style="font-weight:700; margin-bottom:14px;">เลือกเปอร์เซ็นต์ส่วนลดพิเศษ:</div>

            ${SPECIAL_DISCOUNT_OPTIONS.map(p => `
                <div class="coupon-tier-option" onclick="selectSpecialDiscountPercent('${bookingId}', ${p}, ${currentPrice})">
                    <span class="coupon-tier-badge">${p}%</span>
                    <span>ส่วนลดพิเศษ ${p}%</span>
                    <i class="fa-solid fa-chevron-right"></i>
                </div>
            `).join("")}

        `;

    popup.innerHTML = `

        <div class="view-customer-overlay">

            <div class="view-customer-modal" style="max-width:460px;">

                <div class="view-customer-header">

                    <div class="view-customer-title">

                        <div class="view-customer-icon" style="background:var(--green);">
                            <i class="fa-solid fa-percent"></i>
                        </div>

                        <div>
                            <h2>ส่วนลดพิเศษ</h2>
                            <p>${name} · ${formatPhone(phone)}</p>
                        </div>

                    </div>

                    <button
                        class="view-customer-close"
                        onclick="document.getElementById('specialDiscountPopup').remove()">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="view-customer-body" id="specialDiscountPopupBody" style="padding:24px;">

                    ${bodyHTML}

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(popup);

}

function selectSpecialDiscountPercent(bookingId, percent, currentPrice){

    const body = document.getElementById("specialDiscountPopupBody");

    if(!body) return;

    body.innerHTML = `

        <div style="font-weight:700; margin-bottom:10px;">ส่วนลดพิเศษ ${percent}%</div>

        <label style="font-size:13px; font-weight:600; display:block; margin-bottom:6px;">ราคาปัจจุบัน (บาท)</label>

        <input type="number" id="specialDiscountFullPrice" value="${currentPrice || ""}" placeholder="เช่น 1500"
            style="width:100%; padding:10px 12px; border:2px solid #000; border-radius:10px; font-family:'Kanit',sans-serif; font-size:16px; margin-bottom:12px;"
            oninput="updateSpecialDiscountCalc(${percent})">

        <div id="specialDiscountCalcResult" style="font-weight:700; font-size:15px; margin-bottom:16px; min-height:24px;"></div>

        <button class="save-btn" id="specialDiscountConfirmBtn" onclick="confirmSpecialDiscount('${bookingId}', ${percent})">
            <i class="fa-solid fa-check"></i> ยืนยันส่วนลดพิเศษ
        </button>

    `;

    updateSpecialDiscountCalc(percent);

}

function updateSpecialDiscountCalc(percent){

    const priceInput = document.getElementById("specialDiscountFullPrice");

    const resultEl = document.getElementById("specialDiscountCalcResult");

    const confirmBtn = document.getElementById("specialDiscountConfirmBtn");

    if(!priceInput || !resultEl) return;

    const fullPrice = Number(priceInput.value) || 0;

    if(fullPrice <= 0){

        resultEl.textContent = "";

        if(confirmBtn) confirmBtn.disabled = true;

        return;

    }

    const discountAmount = Math.round(fullPrice * (percent / 100));

    const finalPrice = fullPrice - discountAmount;

    resultEl.innerHTML = `ส่วนลด ${discountAmount.toLocaleString("th-TH")} บาท → เก็บจริง <span style="color:var(--primary);">${finalPrice.toLocaleString("th-TH")} บาท</span>`;

    if(confirmBtn) confirmBtn.disabled = false;

}

async function confirmSpecialDiscount(bookingId, percent){

    const fullPrice = Number(document.getElementById("specialDiscountFullPrice").value) || 0;

    if(fullPrice <= 0){

        showToast("กรุณากรอกราคาก่อนครับ", "error");

        return;

    }

    const discountAmount = Math.round(fullPrice * (percent / 100));

    const finalPrice = fullPrice - discountAmount;

    try{

        const { error } = await supabaseClient

            .from("bookings")

            .update({

                price: finalPrice,
                special_discount_percent: percent,
                special_discount_amount: discountAmount,
                special_discount_applied_at: new Date().toISOString()

            })

            .eq("id", bookingId);

        if(error) throw error;

        showToast("ใช้ส่วนลดพิเศษสำเร็จ บันทึกราคาใหม่แล้ว", "success");

        const popup = document.getElementById("specialDiscountPopup");

        if(popup) popup.remove();

        if(document.getElementById("dashboardContainer")){

            await refreshDashboard();

        }

    }catch(error){

        console.error(error);

        showToast(error.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

    }

}

async function cancelSpecialDiscount(bookingId, discountAmount){

    try{

        const { data: bookingRow, error: fetchError } = await supabaseClient

            .from("bookings")

            .select("price")

            .eq("id", bookingId)

            .single();

        if(fetchError) throw fetchError;

        const restoredPrice = (Number(bookingRow.price) || 0) + Number(discountAmount || 0);

        const { error: updateError } = await supabaseClient

            .from("bookings")

            .update({

                price: restoredPrice,
                special_discount_percent: null,
                special_discount_amount: null,
                special_discount_applied_at: null

            })

            .eq("id", bookingId);

        if(updateError) throw updateError;

        showToast("ยกเลิกส่วนลดพิเศษสำเร็จ", "success");

        const popup = document.getElementById("specialDiscountPopup");

        if(popup) popup.remove();

        if(document.getElementById("dashboardContainer")){

            await refreshDashboard();

        }

    }catch(error){

        console.error(error);

        showToast("ยกเลิกส่วนลดพิเศษไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");

    }

}

// Start App
//------------------------------------------

(async function initApp(){

    const { data: { session } } = await supabaseClient.auth.getSession();

    if(!session){

        window.location.href = "login.html";

        return;

    }

    await loadCurrentUserProfile(session.user.id);

    if(!currentUserProfile){

        // หาโปรไฟล์ไม่เจอ (เช่นบัญชีถูกลบไปแล้ว) ให้ออกจากระบบแล้วกลับไปหน้าล็อคอิน
        await supabaseClient.auth.signOut();

        window.location.href = "login.html";

        return;

    }

    applyRoleRestrictions();

    loadAppSettings();

    showDashboard();

    // เผื่อ session หมดอายุ/ถูกออกจากระบบระหว่างใช้งาน ให้เด้งกลับไปหน้าล็อคอินทันที
    supabaseClient.auth.onAuthStateChange(function(event){

        if(event === "SIGNED_OUT"){

            window.location.href = "login.html";

        }

    });

})();

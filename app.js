// ==========================================
// --- 1. FIREBASE SETUP & INIT ---
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, serverTimestamp, orderBy, where, doc, setDoc, getDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCPDFAMArrTmOG96_7YD3bdasaldf8_PtM",
    authDomain: "dairyproject-eb43b.firebaseapp.com",
    projectId: "dairyproject-eb43b",
    storageBucket: "dairyproject-eb43b.firebasestorage.app",
    messagingSenderId: "806924170796",
    appId: "1:806924170796:web:4797bce889b3113bdc4389",
    measurementId: "G-PD8DYS8K79"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const ADMIN_PHONE = "7782859925";
window.selectedGpsLocation = null;

// ==========================================
// --- 🛰️ TELEGRAM ALERTS ---
// ==========================================
window.sendAdminAlert = async (message) => {
    try {
        await fetch(`https://api.telegram.org/bot8293153285:AAEUbY629TlsvlSGTCcGWxAFAHk1k_5EUho/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: "1758085069", text: message, parse_mode: "HTML" })
        });
    } catch (e) { console.error("Telegram Error", e); }
};

// ==========================================
// --- 🚨 AUTH & REDIRECT CONTROL ---
// ==========================================
onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-email');
    const path = window.location.pathname;

    if (user) {
        const phone = user.email.split('@')[0];
        
        // Change this section inside onAuthStateChanged
if (phone === ADMIN_PHONE) {
    // List all pages where the admin is allowed to browse as a visitor
    const isPublicPage = path.includes("index.html") || path === "/" || 
                         path.includes("academy.html") || path.includes("pharmacy.html") || 
                         path.includes("notice.html") || path.includes("gallery.html") || 
                         path.includes("about.html") || path.includes("admission.html");

    // Only force redirect if NOT on a public page and NOT already on admin.html
    if (!isPublicPage && !path.includes("admin.html")) {
        window.location.href = "admin.html"; 
        return;
    }
}

        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userDisplay) {
            userDisplay.style.display = 'inline-block';
            userDisplay.innerHTML = `<a href="dashboard.html" style="color:#27ae60; font-weight:bold; text-decoration:none;">👋 My Portal (${phone})</a>`;
        }

        // Initialize Dashboard
        if (path.includes("dashboard.html")) {
            const prof = document.getElementById('user-profile');
            if(prof) prof.style.display = 'block';
            window.loadUserDashboardData(phone);
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userDisplay) userDisplay.style.display = 'none';
        if (path.includes("dashboard.html")) window.location.href = "index.html";
    }
});

// ==========================================
// --- 2. DATA LOADERS (HOME & PAGES) ---
// ==========================================
async function loadAllContent() {
    // A. Notices
    onSnapshot(query(collection(db, "notices"), orderBy("timestamp", "desc")), (snap) => {
        const marquee = document.getElementById('notice-text');
        const grid = document.getElementById('notices-page-grid');
        const bar = document.getElementById('latest-notice-bar');
        
        if (marquee && !snap.empty) {
            if(bar) bar.style.display = 'block';
            marquee.innerHTML = snap.docs.map(d => `[ ${d.data().title}: ${d.data().content} ]`).join(' | ');
        }
        if (grid) {
            grid.innerHTML = snap.docs.map(d => `
                <div style="background:white; padding:20px; border-left:5px solid #8e44ad; margin-bottom:15px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <h3>${d.data().title}</h3><p>${d.data().content}</p>
                    <small style="color:#999;">${d.data().timestamp?.toDate().toLocaleDateString() || 'Recently'}</small>
                </div>`).join('');
        }
    });

    // B. Pharmacy
    const pGrid = document.getElementById('home-product-grid') || document.getElementById('live-product-grid');
    if (pGrid) {
        onSnapshot(collection(db, "products"), (snap) => {
            pGrid.innerHTML = snap.docs.map(d => {
                const p = d.data();
                return `<div class="product-card" style="background:white; border:1px solid #eee; border-radius:12px; overflow:hidden; padding:10px; text-align:center;">
                    <img src="${p.image}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
                    <h4 style="margin:10px 0 5px;">${p.name}</h4>
                    <p style="color:#27ae60; font-weight:bold;">₹${p.discountPrice} <del style="color:#999; font-size:11px;">₹${p.price}</del></p>
                    <button onclick="window.addToCart('${d.id}', '${p.name.replace(/'/g, "\\'")}', ${p.discountPrice})" style="width:100%; background:#27ae60; color:white; border:none; padding:10px; border-radius:6px; cursor:pointer;">+ Add to Cart</button>
                </div>`;
            }).join('');
        });
    }

    // C. Courses
const cGrid = document.getElementById('home-course-grid') || document.getElementById('live-course-grid');
if (cGrid) {
    onSnapshot(collection(db, "courses"), (snap) => {
        cGrid.innerHTML = snap.docs.map(d => {
            const c = d.data();
            return `
            <div class="course-card">
                <img src="${c.image}" style="width:100%; height:160px; object-fit:cover;">
                <div style="padding:15px;">
                    <h3>${c.title}</h3>
                    <p style="color:#2980b9; font-weight:bold;">₹${c.discountPrice}</p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button onclick="window.viewCourseDetails('${d.id}')" style="flex:1; background:#eee; color:#333; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold;">Details</button>
                        <button onclick="window.location.href='admission.html?courseId=${d.id}'" style="flex:1; background:#27ae60; color:white; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold;">Apply</button>
                    </div>
                </div>
            </div>`;
        }).join(''); // Ensure join is outside the map return
    });
}
}
window.viewCourseDetails = async (id) => {
    const docRef = doc(db, "courses", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const c = snap.data();

    Swal.fire({
        title: c.title,
        width: '700px',
        html: `
            <div style="text-align:left; font-size:14px; line-height:1.6;">
                <img src="${c.image}" style="width:100%; border-radius:10px; margin-bottom:15px;">
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:15px;">
                    <div>📅 <b>Start:</b> ${c.startDate || 'TBA'}</div>
                    <div>🏁 <b>Ends:</b> ${c.endDate || 'TBA'}</div>
                    <div>🕒 <b>Duration:</b> ${c.duration}</div>
                    <div>🎓 <b>Eligibility:</b> ${c.eligibility}</div>
                </div>

                <h4 style="color:#27ae60; border-bottom:1px solid #eee; padding-bottom:5px;">📋 Detailed Syllabus</h4>
                <p style="white-space: pre-line; color:#555;">${c.syllabus || 'Syllabus details pending.'}</p>

                <h4 style="color:#27ae60; border-bottom:1px solid #eee; padding-bottom:5px; margin-top:15px;">🌟 Key Benefits</h4>
                <p style="white-space: pre-line; color:#555;">${c.benefits || 'High-quality training and certification.'}</p>

                <div style="margin-top:20px; padding:15px; background:#e8f4fd; border-radius:8px; text-align:center;">
                    <p style="margin:0; font-weight:bold; color:#2980b9;">Course Fee: ₹${c.discountPrice}</p>
                </div>
            </div>
        `,
        confirmButtonText: 'Apply for this Batch',
        confirmButtonColor: '#27ae60',
        showCloseButton: true
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `admission.html?courseId=${id}`;
        }
    });
};

// ==========================================
// --- 3. FARMER DASHBOARD LOADER ---
// ==========================================
window.loadUserDashboardData = async (phone) => {
    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
    
    // 1. Auto-fill Profile
    const uDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (uDoc.exists()) {
        const u = uDoc.data();
        if(document.getElementById('dash-user-name')) document.getElementById('dash-user-name').innerText = u.name || "Farmer";
        if(document.getElementById('prof-phone')) document.getElementById('prof-phone').value = cleanPhone;
        ['salutation','name','email','dob','qualification','occupation','state','district','address'].forEach(f => {
            if(u[f] && document.getElementById(`prof-${f}`)) document.getElementById(`prof-${f}`).value = u[f];
        });
        if(u.photoBase64 && document.getElementById('prof-pic-preview')) {
            document.getElementById('prof-pic-preview').src = u.photoBase64;
            document.getElementById('prof-pic-base64').value = u.photoBase64;
        }
    }

    // 2. Load Lists with Service Tracker for Vet Requests
    const confs = [ 
        { id: 'list-orders', col: 'orders' }, 
        { id: 'list-courses', col: 'enrollments' }, 
        { id: 'list-vet', col: 'service_requests' }, 
        { id: 'list-grievances', col: 'grievances' } 
    ];

    confs.forEach(c => {
        const cont = document.getElementById(c.id); 
        if (!cont) return;

        onSnapshot(collection(db, c.col), (snap) => {
            let html = "";
            snap.forEach(dDoc => {
                const d = dDoc.data();
                const dbP = String(d.userPhone || d.phone || "").replace(/\D/g, "").slice(-10);

                if (dbP === cleanPhone) {
                    // --- ENROLLMENTS LOGIC ---
                    if (c.col === 'enrollments') {
                        const access = window.checkAccess(d);
                        const isPend = d.status === "pending" || d.status === "Pending";
                        html += `
                        <div style="padding:15px; border:1px solid ${access.locked ? '#e74c3c' : '#ddd'}; margin-bottom:10px; border-radius:8px; background:${access.locked ? '#fff5f5' : '#fff'};">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <b>${d.courseName}</b>
                                <span style="font-size:10px; background:${access.locked ? '#e74c3c' : (isPend ? '#f39c12' : '#27ae60')}; color:white; padding:3px 8px; border-radius:4px;">
                                    ${access.locked ? '🛑 LOCKED' : d.status.toUpperCase()}
                                </span>
                            </div>
                            ${!isPend ? `<button onclick="window.viewBatchDetails('${dDoc.id}')" style="margin-top:10px; background:#2980b9; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; cursor:pointer;">📖 View Batch & Lectures</button>` : ''}
                        </div>`;
                    } 
                    // --- VET SERVICE TRACKER LOGIC ---
                    else if (c.id === 'list-vet') {
                        const status = d.status || "Pending";
                        let step = 1;
                        let color = "#f39c12"; // Default Orange

                        if(status === "Assigned") { step = 2; color = "#3498db"; }
                        if(status === "Vet Dispatched") { step = 3; color = "#9b59b6"; }
                        if(status === "Arrived / Treatment") { step = 4; color = "#e67e22"; }
                        if(status === "Completed") { step = 5; color = "#27ae60"; }

                        html += `
                        <div style="background:#fff; border:1px solid #eee; padding:15px; border-radius:12px; margin-bottom:15px; box-shadow:0 4px 10px rgba(0,0,0,0.03);">
                            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                <span style="font-weight:bold; color:#2c3e50; font-size:14px;">🚑 ${d.animalType} Support</span>
                                <span style="font-size:10px; padding:3px 8px; border-radius:12px; background:${color}; color:white; font-weight:bold;">${status.toUpperCase()}</span>
                            </div>
                            
                            <div style="height:6px; background:#f0f0f0; border-radius:10px; overflow:hidden; display:flex; margin:15px 0 5px 0;">
                                <div style="width:${(step/5)*100}%; background:${color}; height:100%; transition:0.5s;"></div>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:9px; color:#999; text-transform:uppercase;">
                                <span>Request</span><span>Assigned</span><span>On Way</span><span>Clinic</span><span>Finish</span>
                            </div>
                        </div>`;
                    }
                    else if (c.id === 'list-grievances') {
                        const status = d.status || "Pending";
                        html += `
                        <div style="padding:15px; border-bottom:1px solid #eee; background: #fff; margin-bottom:10px; border-radius:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <b>${d.category}</b>
                                <span style="font-size:10px; background:${status === 'Resolved' ? '#27ae60' : '#e67e22'}; color:white; padding:2px 8px; border-radius:10px;">${status}</span>
                            </div>
                            <p style="font-size:12px; color:#666; margin:8px 0;">${d.message.substring(0, 50)}...</p>
                            <button onclick="window.printGrievance('${dDoc.id}')" style="background:#f1f2f6; border:none; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer;">🖨️ View & Print</button>
                        </div>`;
                    }
                    // --- Inside loadUserDashboardData in app.js ---
else if (c.id === 'list-orders') {
    const status = d.status || "Order Placed";
    let color = "#3498db"; // Default Blue
    if(status === "Dispatched") color = "#9b59b6";
    if(status === "Delivered") color = "#27ae60";
    if(status === "Cancelled") color = "#e74c3c";

    html += `
    <div style="background:#fff; border:1px solid #eee; padding:15px; border-radius:12px; margin-bottom:15px; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:bold; color:#2c3e50;">📦 Order Placed</span>
            <span style="font-size:10px; padding:3px 8px; border-radius:12px; background:${color}; color:white; font-weight:bold;">${status.toUpperCase()}</span>
        </div>
        
        <div style="font-size:13px; color:#666; margin-bottom:10px;">
            ${d.items.map(i => `• ${i.name}`).join('<br>')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f8f9fa; pt-10; margin-top:10px; padding-top:10px;">
            <span style="font-weight:bold; color:#27ae60; font-size:16px;">₹${d.totalAmount}</span>
            <button onclick="window.printOrderReceipt('${dDoc.id}')" style="background:#f1f2f6; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">🖨️ View Receipt</button>
        </div>
    </div>`;
}
                    // --- DEFAULT LIST LOGIC (Orders/Grievances) ---
                    else {
                        html += `<div style="padding:10px; border-bottom:1px solid #eee; font-size:13px;"><b>${d.status || 'Received'}</b> - ${d.courseName || d.animalType || d.type || 'Request'}</div>`;
                    }
                }
            });
            cont.innerHTML = html || `<p style='font-size:12px; color:#999;'>No history found.</p>`;
        });
    });
};

// ==========================================
// --- 4. ACCESS CONTROL & BATCH VIEWER ---
// ==========================================
window.checkAccess = (d) => {
    const today = new Date(); today.setHours(0,0,0,0);
    if (d.unlockUntil && today <= new Date(d.unlockUntil)) return { locked: false };
    if (d.nextDueDate) {
        const grace = new Date(d.nextDueDate); grace.setDate(grace.getDate() + 5);
        if ((Number(d.totalFee) - Number(d.feePaid)) > 0 && today > grace) return { locked: true };
    }
    return { locked: false };
};

window.viewBatchDetails = async (enrollId) => {
    Swal.fire({ title: 'Loading...', didOpen: () => Swal.showLoading() });
    const d = (await getDoc(doc(db, "enrollments", enrollId))).data();
    const access = window.checkAccess(d);
    
    Swal.fire({
        title: `Batch: ${d.courseName}`, width: '800px',
        html: `
            <div style="text-align:left; font-size:14px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; background:#f8f9fa; padding:15px; border-radius:10px; margin-bottom:20px;">
                    <div><p>📅 Join Date: ${d.enrolledAt?.toDate().toLocaleDateString()}</p><p>💰 Total Fee: ₹${d.totalFee}</p><p>✅ Paid: ₹${d.feePaid}</p></div>
                    <div>
                        <p>⏳ Next Due: ${d.nextDueDate || 'No Dues'}</p>
                        <p>📉 Balance: <span style="color:red; font-weight:bold;">₹${d.totalFee - d.feePaid}</span></p>
                        <button onclick="window.printFeeReceipt('${enrollId}')" style="background:#eee; border:1px solid #ccc; padding:5px 10px; border-radius:4px; cursor:pointer;">🖨️ Receipt</button>
                    </div>
                </div>
                ${access.locked ? `
                    <div style="background:#fff5f5; border:1px solid #feb2b2; padding:20px; text-align:center; border-radius:10px;">
                        <h2 style="color:#c53030; margin:0;">🔒 Content Locked</h2>
                        <p>Installment is 5+ days overdue. Clear balance to unlock.</p>
                    </div>` : `
                    <h4 style="border-bottom:2px solid #2980b9; padding-bottom:5px; color:#2980b9;">📚 Premium Lectures</h4>
                    <div id="lecture-list" style="max-height:250px; overflow-y:auto; border:1px solid #ddd; padding:10px; border-radius:8px;">Loading playlist...</div>
                    <div style="text-align:center; margin-top:15px;">
                        <button id="exam-btn" disabled style="padding:10px 20px; background:#95a5a6; color:white; border:none; border-radius:6px; transition: 0.3s;">📝 Online Exam</button>
                    </div>`}
            </div>`,
        showConfirmButton: false, showCloseButton: true,
        // Added enrollId here
        didOpen: () => { if (!access.locked) window.loadPlaylist(d.courseId, enrollId); }
    });
};
window.loadPlaylist = async (courseId, enrollId) => {
    const q = query(collection(db, "lectures"), where("courseId", "==", courseId), orderBy("order", "asc"));
    const snap = await getDocs(q);
    const div = document.getElementById('lecture-list');
    const examBtn = document.getElementById('exam-btn');

    if (snap.empty) { div.innerHTML = "<p>No lectures yet.</p>"; return; }

    // Check watched status from local storage
    const watched = JSON.parse(localStorage.getItem(`watched_${enrollId}`)) || [];

    div.innerHTML = snap.docs.map((doc, i) => {
        const isWatched = watched.includes(doc.id);
        return `
        <div style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid #eee;">
            <span style="background:${isWatched ? '#27ae60' : '#2980b9'}; color:white; width:25px; height:25px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px;">${i+1}</span>
            <div style="flex:1;"><b style="cursor:pointer;" onclick="window.playLecture('${doc.data().videoId}', '${doc.id}', '${enrollId}', '${courseId}')">${doc.data().title}</b></div>
            <span style="font-size:10px; color:${isWatched ? 'green' : '#999'};">${isWatched ? '✅ Watched' : '⚪ Pending'}</span>
        </div>`;
    }).join('');

    // 🔥 ENABLE BUTTON logic
    if (snap.size > 0 && watched.length >= snap.size) {
        examBtn.disabled = false;
        examBtn.style.background = "#27ae60";
        examBtn.style.cursor = "pointer";
        examBtn.innerText = "🚀 Start Final Exam";
        
        // Link to the course exam link
        const cDoc = await getDoc(doc(db, "courses", courseId));
        if (cDoc.exists() && cDoc.data().testLink) {
            examBtn.onclick = () => window.openOnlineExam(cDoc.data().testLink, enrollId);
        }
    }
};

window.playLecture = (vId, lecId, enrollId, courseId) => {
    Swal.fire({
        html: `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${vId}?autoplay=1" frameborder="0" allowfullscreen></iframe>`,
        width: '800px', showConfirmButton: false,
        didClose: () => {
            // Mark as watched
            let watched = JSON.parse(localStorage.getItem(`watched_${enrollId}`)) || [];
            if (!watched.includes(lecId)) {
                watched.push(lecId);
                localStorage.setItem(`watched_${enrollId}`, JSON.stringify(watched));
            }
            // Refresh playlist to update checkmarks and button
            window.loadPlaylist(courseId, enrollId);
        }
    });
};

window.printFeeReceipt = async (enrollId) => {
    const snap = await getDoc(doc(db, "enrollments", enrollId));
    if (!snap.exists()) return Swal.fire('Error', 'Record not found', 'error');
    
    const d = snap.data();
    const balance = (Number(d.totalFee) || 0) - (Number(d.feePaid) || 0);
    const payDate = d.lastPaymentAt ? d.lastPaymentAt.toDate().toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    const win = window.open('', '', 'width=900,height=800');
    win.document.write(`
        <html>
        <head>
            <title>Fee Receipt - ${d.userName}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 0; margin: 0; background: #f9f9f9; }
                .receipt-card { width: 700px; margin: 40px auto; background: white; padding: 40px; border: 1px solid #eee; box-shadow: 0 0 20px rgba(0,0,0,0.05); position: relative; }
                
                /* Design Elements */
                .top-bar { position: absolute; top: 0; left: 0; width: 100%; height: 8px; background: linear-gradient(to right, #2c3e50, #27ae60); }
                
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f1f1; padding-bottom: 20px; margin-bottom: 30px; }
                .logo-section img { height: 70px; margin-bottom: 5px; }
                .org-info { text-align: right; }
                .org-name { color: #2c3e50; font-size: 22px; font-weight: bold; margin: 0; }
                .org-details { font-size: 12px; color: #666; margin: 3px 0; line-height: 1.4; }

                .receipt-title { text-align: center; text-transform: uppercase; letter-spacing: 2px; color: #27ae60; font-weight: bold; margin-bottom: 30px; border: 1px solid #27ae60; display: inline-block; padding: 5px 20px; border-radius: 4px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .info-box b { color: #2c3e50; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 4px; }
                .info-box span { font-size: 15px; font-weight: 500; }

                .fee-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .fee-table th { background: #f8f9fa; text-align: left; padding: 12px; border: 1px solid #eee; font-size: 13px; }
                .fee-table td { padding: 12px; border: 1px solid #eee; font-size: 14px; }
                
                .total-section { background: #f1f8f5; padding: 15px; border-radius: 8px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .row.final { border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px; font-size: 18px; font-weight: bold; color: #c0392b; }

                .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                .print-btn { background: #2c3e50; color: white; padding: 10px 25px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 20px; }
                
                @media print { .print-btn { display: none; } body { background: white; } .receipt-card { box-shadow: none; border: none; width: 100%; margin: 0; } }
            </style>
        </head>
        <body>
            <div class="receipt-card">
                <div class="top-bar"></div>
                
                <div class="header">
                    <div class="logo-section">
                        <img src="DDP logo.png" alt="DDP Logo">
                    </div>
                    <div class="org-info">
                        <p class="org-name">Dairy Development Programme</p>
                        <p class="org-details">Santnagar, Gangjala, Ward No. 04</p>
                        <p class="org-details">Saharsa, Bihar - 852201</p>
                        <p class="org-details">📞 +91 7782859925 | 🌐 ddpsaharsa.com</p>
                    </div>
                </div>

                <center><div class="receipt-title">Course Fee Receipt</div></center>

                <div class="info-grid">
                    <div class="info-box"><b>Student Name</b> <span>${d.userName}</span></div>
                    <div class="info-box"><b>Receipt No.</b> <span>#FEE-${enrollId.slice(-6).toUpperCase()}</span></div>
                    <div class="info-box"><b>Course Selected</b> <span>${d.courseName}</span></div>
                    <div class="info-box"><b>Payment Date</b> <span>${payDate}</span></div>
                </div>

                <table class="fee-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: right;">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Professional Course Enrollment Fee</td>
                            <td style="text-align: right;">₹${d.totalFee}</td>
                        </tr>
                        <tr>
                            <td>Total Fee Paid Till Date</td>
                            <td style="text-align: right; color: #27ae60;">- ₹${d.feePaid}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="row"><span>Remaining Balance:</span> <span>₹${balance}</span></div>
                    <div class="row"><span>Upcoming Installment:</span> <span>${d.nextDueDate || 'No Dues Pending'}</span></div>
                    <div class="row final"><span>Net Balance Due:</span> <span>₹${balance}</span></div>
                </div>

                <div class="footer">
                    <p><b>Note:</b> This is a computer-generated electronic receipt. No physical signature is required.</p>
                    <p>Terms: Fees once paid are non-refundable. For support, contact our Saharsa helpdesk.</p>
                    <button class="print-btn" onclick="window.print()">🖨️ Print Official Receipt</button>
                </div>
            </div>
        </body>
        </html>
    `);
    win.document.close();
};

// ==========================================
// --- 5. FORMS & ACTIONS ---
// ==========================================
window.saveExtendedProfile = async () => {
    Swal.fire({ title: 'Updating...', didOpen: () => Swal.showLoading() });
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
        salutation: document.getElementById('prof-salutation').value,
        name: document.getElementById('prof-name').value,
        email: document.getElementById('prof-email').value,
        dob: document.getElementById('prof-dob').value,
        qualification: document.getElementById('prof-qualification').value,
        occupation: document.getElementById('prof-occupation').value,
        address: document.getElementById('prof-address').value,
        photoBase64: document.getElementById('prof-pic-base64')?.value || "",
        updatedAt: serverTimestamp()
    });
    Swal.fire('Success', 'Profile Updated', 'success');
};

window.showEnquiry = () => {
    Swal.fire({
        title: 'Enquire Now',
        html: `<input id="en-n" class="swal2-input" placeholder="Name"><input id="en-p" class="swal2-input" placeholder="Phone"><textarea id="en-m" class="swal2-textarea" placeholder="Message"></textarea>`,
        preConfirm: () => ({ n: document.getElementById('en-n').value, p: document.getElementById('en-p').value, m: document.getElementById('en-m').value })
    }).then(async (r) => {
        if (r.value) {
            await addDoc(collection(db, "enquiries"), { ...r.value, timestamp: serverTimestamp() });
            window.sendAdminAlert(`📩 <b>NEW ENQUIRY</b>\nFrom: ${r.value.n}\nPhone: ${r.value.p}`);
            Swal.fire('Sent', 'We will call you back.', 'success');
        }
    });let teleMsg = `📩 <b>NEW BUSINESS ENQUIRY</b>\n\n` +
    `👤 <b>Name:</b> ${r.value.n}\n` +
    `📞 <b>Phone:</b> ${r.value.p}\n` +
    `📝 <b>Message:</b> ${r.value.m}`;
window.sendAdminAlert(teleMsg);
};

// --- Inside app.js ---
window.bookVet = async () => {
    const data = {
        customerName: document.getElementById('customer-name').value.trim(),
        phone: document.getElementById('customer-phone').value.trim(),
        animalType: document.getElementById('animal-type').value,
        emergencyLevel: document.getElementById('emergency-level').value,
        vetAddress: document.getElementById('vet-address').value.trim(),
        symptoms: document.getElementById('case-details').value.trim(),
        status: "Pending",
        gps: window.selectedGpsLocation || "Not provided",
        timestamp: serverTimestamp()
    };

    if (!data.phone || !data.vetAddress) return Swal.fire('Error', 'Phone and Location are required!', 'error');

    try {
        Swal.fire({ title: 'Sending Request...', didOpen: () => Swal.showLoading() });
        await addDoc(collection(db, "service_requests"), data);

        // --- FULL TELEGRAM ALERT ---
        let teleMsg = `🚑 <b>NEW VET REQUEST (${data.emergencyLevel})</b>\n\n`;
        teleMsg += `👤 <b>Farmer:</b> ${data.customerName}\n`;
        teleMsg += `📞 <b>Phone:</b> ${data.phone}\n`;
        teleMsg += `🐾 <b>Animal:</b> ${data.animalType}\n`;
        teleMsg += `📍 <b>Address:</b> ${data.vetAddress}\n`;
        teleMsg += `📝 <b>Description:</b> ${data.symptoms || 'N/A'}\n`;
        if (window.selectedGpsLocation) {
            teleMsg += `🗺️ <b>GPS:</b> <a href="${data.gps}">View on Google Maps</a>`;
        }

        window.sendAdminAlert(teleMsg);
        Swal.fire('Success', 'Request sent! Our team will contact you.', 'success');
        
        // Reset form
        ['customer-name', 'customer-phone', 'vet-address', 'case-details'].forEach(id => document.getElementById(id).value = "");
    } catch (e) {
        Swal.fire('Error', 'Failed to send request.', 'error');
    }
};

// ==========================================
// --- 6. MAP UTILITIES ---
// ==========================================
window.openMapPicker = (inputId) => {
    window.targetId = inputId;
    const modal = document.getElementById('universal-map-modal');
    if(modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            if (!window.pMap && typeof L !== 'undefined') {
                window.pMap = L.map('universal-map').setView([25.88, 86.60], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.pMap);
                window.pMark = L.marker([25.88, 86.60], { draggable: true }).addTo(window.pMap);
            } else if (window.pMap) { window.pMap.invalidateSize(); }
        }, 300);
    }
};

window.confirmMapLocation = async () => {
    if(!window.pMark) return window.closeMapPicker();
    const ll = window.pMark.getLatLng();
    window.selectedGpsLocation = `https://maps.google.com/?q=${ll.lat},${ll.lng}`;
    document.getElementById('universal-map-modal').style.display = 'none';
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${ll.lat}&lon=${ll.lng}`);
        const data = await res.json();
        const targetEl = document.getElementById(window.targetId);
        if(targetEl) targetEl.value = data.display_name.split(',').slice(0, 3).join(',');
    } catch(e) {}
};

window.closeMapPicker = () => { const m = document.getElementById('universal-map-modal'); if(m) m.style.display = 'none'; };

// ==========================================
// --- 7. CART & AUTH ---
// ==========================================
let cart = [];
window.addToCart = (id, name, price) => {
    cart = JSON.parse(localStorage.getItem('ddp_cart')) || [];
    cart.push({id, name, price, qty: 1});
    localStorage.setItem('ddp_cart', JSON.stringify(cart));
    const badge = document.getElementById('cart-badge'); if (badge) badge.innerText = cart.length;
    Swal.fire({toast:true, position:'top-end', icon:'success', title: 'Added', showConfirmButton:false, timer:1500});
};

window.showLogin = () => {
    Swal.fire({
        title: 'Login', html: `<input id="l-p" class="swal2-input" placeholder="Phone"><input id="l-s" class="swal2-input" type="password" placeholder="PIN">`,
        showDenyButton: true, confirmButtonText: 'Login', denyButtonText: 'Register'
    }).then(async (r) => {
        const p = document.getElementById('l-p').value, s = document.getElementById('l-s').value;
        if (r.isConfirmed) {
            signInWithEmailAndPassword(auth, `${p}@ddpsaharsa.com`, s).catch(() => Swal.fire('Error PIN'));
        } else if (r.isDenied) {
            await createUserWithEmailAndPassword(auth, `${p}@ddpsaharsa.com`, s);
            await setDoc(doc(db, "users", auth.currentUser.uid), { userPhone: p, joinedAt: serverTimestamp() });
            window.location.href = "dashboard.html";
        }
    });
};
// ==========================================
// --- 8. PHARMACY CART & CHECKOUT LOGIC ---
// ==========================================

// 1. Render the Cart UI (Updates automatically when called)
window.renderCart = () => {
    let cart = JSON.parse(localStorage.getItem('ddp_cart')) || [];
    
    // Update the number on the Shopping Cart badge
    const badge = document.getElementById('cart-badge'); 
    if (badge) badge.innerText = cart.length;

    const cartDisplay = document.getElementById('cart-items');
    if (cartDisplay) {
        if (cart.length === 0) { 
            cartDisplay.innerHTML = '<p style="color: grey; text-align:center;">Your cart is empty.</p>'; 
        } else {
            let total = 0;
            let html = cart.map((item, idx) => {
                total += Number(item.price);
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee; font-size:13px;">
                    <span>${item.name}</span>
                    <b>₹${item.price}</b>
                    <button onclick="window.removeFromCart(${idx})" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">✖</button>
                </div>`;
            }).join('');
            html += `<div style="padding:15px 0 5px 0; text-align:right; font-size:16px;"><b>Total: ₹${total}</b></div>`;
            cartDisplay.innerHTML = html;
        }
    }
};

// 2. Add to Cart (Now calls renderCart immediately)
window.addToCart = (id, name, price) => {
    let cart = JSON.parse(localStorage.getItem('ddp_cart')) || [];
    cart.push({id, name, price});
    localStorage.setItem('ddp_cart', JSON.stringify(cart));
    
    // 🔥 This is the fix: Update the UI right away!
    window.renderCart(); 
    
    Swal.fire({
        toast: true, 
        position: 'top-end', 
        icon: 'success', 
        title: 'Added to Cart', 
        showConfirmButton: false, 
        timer: 1500
    });
};

// 3. Remove Item from Cart
window.removeFromCart = (index) => { 
    let cart = JSON.parse(localStorage.getItem('ddp_cart')) || [];
    cart.splice(index, 1); 
    localStorage.setItem('ddp_cart', JSON.stringify(cart)); 
    window.renderCart(); 
};

window.checkoutCart = async () => {
    let cart = JSON.parse(localStorage.getItem('ddp_cart')) || [];
    if (cart.length === 0) return;

    const { value: formValues } = await Swal.fire({
        title: 'Delivery Details',
        html: `
            <input id="sw-n" class="swal2-input" placeholder="Farmer Name">
            <input id="sw-p" class="swal2-input" placeholder="Phone Number">
            <div style="display:flex; width:80%; margin:1em auto; gap:5px;">
                <input id="sw-a" class="swal2-input" placeholder="Village Address" style="margin:0; flex:1;">
                <button type="button" onclick="window.openMapPicker('sw-a')" style="background:#e67e22; color:white; border:none; padding:0 15px; border-radius:5px; cursor:pointer;">📍 Map</button>
            </div>`,
        preConfirm: () => {
            const n = document.getElementById('sw-n').value;
            const p = document.getElementById('sw-p').value;
            const a = document.getElementById('sw-a').value;
            if(!n || !p || !a) return Swal.showValidationMessage('Fill all details');
            return { name: n, phone: p, address: a };
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Placing Order...', didOpen: () => Swal.showLoading() });
        
        const total = cart.reduce((sum, i) => sum + Number(i.price), 0);
        const itemsList = cart.map(i => `• ${i.name} - ₹${i.price}`).join('\n');

        // 1. Save to Database
        await addDoc(collection(db, "orders"), {
            customerName: formValues.name,
            phone: formValues.phone,
            address: formValues.address,
            items: cart,
            totalAmount: total,
            status: "Order Placed",
            gpsLocation: window.selectedGpsLocation || "Not Provided",
            timestamp: serverTimestamp()
        });

        // 2. 🔥 Send Detailed Telegram Alert
        let teleMsg = `📦 <b>NEW PHARMACY ORDER</b>\n\n`;
        teleMsg += `👤 <b>Farmer:</b> ${formValues.name}\n`;
        teleMsg += `📞 <b>Phone:</b> ${formValues.phone}\n`;
        teleMsg += `📍 <b>Address:</b> ${formValues.address}\n`;
        if(window.selectedGpsLocation) teleMsg += `🗺️ <b>GPS:</b> <a href="${window.selectedGpsLocation}">View on Google Maps</a>\n\n`;
        teleMsg += `💊 <b>Items:</b>\n${itemsList}\n\n`;
        teleMsg += `💰 <b>Total Amount:</b> ₹${total}`;

        window.sendAdminAlert(teleMsg);

        // 3. Clear Cart
        localStorage.removeItem('ddp_cart');
        window.selectedGpsLocation = null;
        window.renderCart();
        Swal.fire('Success', 'Order Placed! DDP team will call you.', 'success');
    }
};
// ==========================================
// --- 9. MAP UTILITIES (FOR CHECKOUT) ---
// ==========================================
window.openMapPicker = (inputId) => {
    window.targetId = inputId;
    const modal = document.getElementById('universal-map-modal');
    if(modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            if (!window.pMap && typeof L !== 'undefined') {
                window.pMap = L.map('universal-map').setView([25.88, 86.60], 13); // Centered on Saharsa
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.pMap);
                window.pMark = L.marker([25.88, 86.60], { draggable: true }).addTo(window.pMap);
            } else if (window.pMap) { window.pMap.invalidateSize(); }
        }, 300);
    }
};

window.confirmMapLocation = async () => {
    if(!window.pMark) return window.closeMapPicker();
    const ll = window.pMark.getLatLng();
    window.selectedGpsLocation = `https://www.google.com/maps?q=${ll.lat},${ll.lng}`;
    document.getElementById('universal-map-modal').style.display = 'none';
    
    // Auto-fill address box with coordinates if geocoding fails
    const targetEl = document.getElementById(window.targetId);
    if(targetEl) targetEl.value = `GPS Location Selected`; 
};

window.closeMapPicker = () => { 
    const m = document.getElementById('universal-map-modal'); 
    if(m) m.style.display = 'none'; 
};
// ==========================================
// --- DETAILED ADMISSION LOGIC ---
// ==========================================
window.setupDetailedAdmission = async () => {
    const dropdown = document.getElementById('adm-course');
    const form = document.getElementById('detailed-admission-form');
    if (!dropdown || !form) return;

    // 1. Fetch Active Courses for Dropdown
    onSnapshot(collection(db, "courses"), (snap) => {
        dropdown.innerHTML = '<option value="">-- Click to choose an active batch --</option>';
        snap.forEach(d => {
            const c = d.data();
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.dataset.name = c.title;
            opt.dataset.fee = c.discountPrice;
            opt.innerText = `${c.title} (Fee: ₹${c.discountPrice})`;
            dropdown.appendChild(opt);
        });
    });
    // 2. AUTO-SELECT logic based on URL
    const urlParams = new URLSearchParams(window.location.search);
    const courseIdFromUrl = urlParams.get('courseId');
    if (courseIdFromUrl) {
        dropdown.value = courseIdFromUrl;
    }

    // 2. Handle Form Submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        const sel = dropdown.options[dropdown.selectedIndex];
        
        const photo = document.getElementById('base-photo').value;

        // Locate this in app.js inside setupDetailedAdmission -> form.onsubmit
const data = {
    courseId: dropdown.value,
    courseName: sel.dataset.name,
    totalFee: Number(sel.dataset.fee),
    userName: document.getElementById('adm-name').value,
    fatherName: document.getElementById('adm-father').value,
    motherName: document.getElementById('adm-mother').value, // Add this
    aadharNumber: document.getElementById('adm-aadhar').value, // Add this
    dob: document.getElementById('adm-dob').value, // Add this
    gender: document.getElementById('adm-gender').value, // Add this
    userPhone: document.getElementById('adm-phone').value,
    address: document.getElementById('adm-address').value,
    city: document.getElementById('adm-city').value, // Add this
    state: document.getElementById('adm-state').value, // Add this
    pincode: document.getElementById('adm-pincode').value, // Add this
    
    // Documents (Base64 strings)
    studentPhoto: document.getElementById('base-photo').value,
    aadharCopy: document.getElementById('base-aadhar').value,
    qualifCertificate: document.getElementById('base-qual').value,
    
    status: "pending",
    feePaid: 0,
    enrolledAt: serverTimestamp()
};

        try {
            Swal.fire({ title: 'Processing Admission...', didOpen: () => Swal.showLoading() });
            
            // Save Admission Application
            await addDoc(collection(db, "enrollments"), data);
            
            // SYNC TO FARMER PORTAL: Update User Profile Photo & Name
            if (auth.currentUser) {
                await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    photoBase64: photo,
                    name: data.userName,
                    updatedAt: serverTimestamp()
                });
            }// Inside setupDetailedAdmission form.onsubmit
let teleMsg = `🎓 <b>NEW ADMISSION APPLICATION</b>\n\n` +
`👤 <b>Student:</b> ${data.userName}\n` +
`📅 <b>DOB:</b> ${data.dob} (${data.gender})\n` +
`📞 <b>Phone:</b> ${data.userPhone}\n` +
`🆔 <b>Aadhar:</b> ${data.aadharNumber}\n` +
`🏠 <b>Address:</b> ${data.address}, ${data.city}\n` +
`📚 <b>Course:</b> ${data.courseName}\n` +
`💰 <b>Total Fee:</b> ₹${data.totalFee}`;
window.sendAdminAlert(teleMsg);
            
            Swal.fire('Application Sent', 'Documents uploaded successfully. Admin will approve soon.', 'success')
                .then(() => window.location.href = "index.html");

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Submission failed. Please try again.', 'error');
        }
    };
};
// Add to the bottom of app.js
window.toggleMenu = () => {
    document.getElementById('nav-links').classList.toggle('active');
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.dropdown').forEach(d => {
        d.addEventListener('click', function(e) {
            if (window.innerWidth < 992) {
                e.preventDefault();
                this.classList.toggle('show-submenu');
            }
        });
    });
});
// Function to inject the WhatsApp button globally
function injectWhatsAppButton() {
    const whatsappDiv = document.createElement('div');
    whatsappDiv.id = 'whatsapp-floating-button';
    
    // Replace [YOUR_PHONE_NUMBER] with your actual number (e.g., 919876543210)
    whatsappDiv.innerHTML = `
        <a href="https://wa.me/917782859925?text=Hello!%20I%20have%20an%20enquiry." 
           target="_blank" 
           style="
            position: fixed;
            bottom: 30px;
            right: 30px;
            background-color: #25d366;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50px;
            text-align: center;
            font-size: 30px;
            box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            transition: transform 0.3s ease;
           "
           onmouseover="this.style.transform='scale(1.1)'"
           onmouseout="this.style.transform='scale(1)'">
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
                 style="width: 35px; height: 35px;" alt="WhatsApp">
        </a>
    `;
    document.body.appendChild(whatsappDiv);
}
window.addEventListener('load', injectWhatsAppButton);


// --- Add to app.js ---
window.submitGrievance = async () => {
    const data = {
        name: document.getElementById('griv-name').value.trim(),
        phone: document.getElementById('griv-phone').value.trim(),
        category: document.getElementById('griv-category').value,
        message: document.getElementById('griv-message').value.trim(),
        status: "Pending",
        timestamp: serverTimestamp()
    };

    if (!data.phone || !data.message || !data.category) {
        return Swal.fire('Error', 'Please fill all fields', 'error');
    }

    try {
        Swal.fire({ title: 'Submitting...', didOpen: () => Swal.showLoading() });
        const docRef = await addDoc(collection(db, "grievances"), data);

        // 🔥 Telegram Alert with full details
        const teleMsg = `🚨 <b>NEW GRIEVANCE: ${data.category}</b>\n\n` +
                        `👤 <b>Farmer:</b> ${data.name}\n` +
                        `📞 <b>Phone:</b> ${data.phone}\n` +
                        `📝 <b>Issue:</b> ${data.message}`;
        window.sendAdminAlert(teleMsg);

        Swal.fire('Submitted', 'Grievance recorded. ID: ' + docRef.id.slice(-5), 'success');
        
        // Reset fields
        ['griv-name', 'griv-phone', 'griv-category', 'griv-message'].forEach(id => document.getElementById(id).value = "");
    } catch (e) {
        Swal.fire('Error', 'Submission failed.', 'error');
    }
};
// Load playlist with completion check
window.loadPlaylist = async (courseId, enrollId) => {
    const q = query(collection(db, "lectures"), where("courseId", "==", courseId), orderBy("order", "asc"));
    const snap = await getDocs(q);
    const div = document.getElementById('lecture-list');
    const examBtn = document.getElementById('exam-btn');

    // Simple completion tracking logic (check local storage or user doc)
    const watched = JSON.parse(localStorage.getItem(`watched_${enrollId}`)) || [];
    
    div.innerHTML = snap.docs.map((doc, i) => {
        const isWatched = watched.includes(doc.id);
        return `
        <div style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid #eee;">
            <div style="flex:1;"><b style="cursor:pointer;" onclick="window.playLecture('${doc.data().videoId}', '${doc.id}', '${enrollId}')">${doc.data().title}</b></div>
            <span style="font-size:10px; color:${isWatched ? 'green' : '#999'};">${isWatched ? '✅ Watched' : '⚪ Pending'}</span>
        </div>`;
    }).join('');

    // Enable exam if all are watched
    if (watched.length >= snap.size && snap.size > 0) {
        examBtn.disabled = false;
        examBtn.style.background = "#27ae60";
        examBtn.style.cursor = "pointer";
        examBtn.innerText = "🚀 Start Final Online Exam";
    }
};

window.playLecture = (vId, lecId, enrollId) => {
    // Record as watched
    let watched = JSON.parse(localStorage.getItem(`watched_${enrollId}`)) || [];
    if(!watched.includes(lecId)) {
        watched.push(lecId);
        localStorage.setItem(`watched_${enrollId}`, JSON.stringify(watched));
    }

    Swal.fire({
        html: `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${vId}?autoplay=1" frameborder="0" allowfullscreen></iframe>`,
        width: '800px', showConfirmButton: false,
        didClose: () => { window.viewBatchDetails(enrollId); } // Refresh to update ✅ icons
    });
};

window.openOnlineExam = (testLink, enrollId) => {
    if(!testLink) return Swal.fire('Error', 'No exam link set for this course.', 'error');
    
    Swal.fire({
        title: 'Starting Exam',
        text: 'After completing the exam on the external site, your marks will be verified by the admin.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Open Exam Link'
    }).then((result) => {
        if (result.isConfirmed) {
            window.open(testLink, '_blank');
            // Notify admin that student started exam
            window.sendAdminAlert(`📝 Student is attempting exam for Enrollment ID: ${enrollId}`);
        }
    });
};
window.printGrievance = async (id) => {
    const d = (await getDoc(doc(db, "grievances", id))).data();
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`
        <html><body style="font-family:sans-serif; padding:50px; border:2px solid #eee;">
            <center>
                <img src="DDP logo.png" style="height:60px;">
                <h2 style="color:#c0392b;">DDP Saharsa - Grievance Receipt</h2>
                <p>Status: <b>${d.status}</b></p>
            </center>
            <hr>
            <p><b>Complaint ID:</b> ${id}</p>
            <p><b>Farmer Name:</b> ${d.name}</p>
            <p><b>Phone:</b> ${d.phone}</p>
            <p><b>Subject:</b> ${d.subject}</p>
            <div style="background:#f9f9f9; padding:20px; border-radius:10px; margin-top:20px;">
                <b>Description:</b><br>${d.message}
            </div>
            <p style="margin-top:40px; font-size:12px; color:#999;">Generated on: ${new Date().toLocaleString()}</p>
            <center><br><button onclick="window.print()" style="padding:10px 20px; background:#2c3e50; color:white; border:none; cursor:pointer;">Print Now</button></center>
        </body></html>
    `);
    win.document.close();
};
    
window.handleLogout = () => signOut(auth).then(() => location.href="index.html");

window.onload = () => { 
    if (typeof loadAllContent === 'function') loadAllContent();
    window.setupDetailedAdmission();
    window.renderCart();
    const badge = document.getElementById('cart-badge'); 
    if (badge) badge.innerText = (JSON.parse(localStorage.getItem('ddp_cart')) || []).length;
    if(window.renderCart) window.renderCart(); // Forces cart UI to load on page refresh

    // Pharmacy Live Search Logic
    const searchBox = document.getElementById('product-search');
    if (searchBox) {
        searchBox.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.product-card');
            cards.forEach(card => {
                const title = card.querySelector('h4').innerText.toLowerCase();
                card.style.display = title.includes(term) ? 'block' : 'none';
            });
        });
    }
    // --- Inside window.onload in app.js ---
    // Call the function on page load


// Simple Visitor Counter
let visits = localStorage.getItem('ddp_visits') || 0;
visits = parseInt(visits) + 1;
localStorage.setItem('ddp_visits', visits);
const visitorEl = document.getElementById('visitor-count');
if (visitorEl) visitorEl.innerText = visits.toLocaleString();

// Auto-Set Last Updated Date (Optional)
const updateEl = document.getElementById('last-updated');
if (updateEl) {
    const today = new Date();
    updateEl.innerText = today.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}
    // Add this inside the loadAllContent() function in app.js
const galleryGrid = document.getElementById('gallery-grid');
if (galleryGrid) {
    onSnapshot(query(collection(db, "gallery"), orderBy("timestamp", "desc")), (snap) => {
        if (snap.empty) {
            galleryGrid.innerHTML = "<p style='text-align:center;'>No photos in the gallery yet.</p>";
            return;
        }
        galleryGrid.innerHTML = snap.docs.map(docSnap => {
            const g = docSnap.data();
            return `
            <div class="gallery-item" style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                <img src="${g.url}" style="width:100%; height:250px; object-fit:cover; display:block;" alt="${g.caption}">
                <div style="padding:15px; border-top:1px solid #eee;">
                    <p style="margin:0; font-size:14px; color:#555; font-weight:500;">${g.caption || 'DDP Saharsa Impact'}</p>
                    <small style="color:#999; font-size:11px;">${g.timestamp?.toDate().toLocaleDateString() || ''}</small>
                </div>
            </div>`;
        }).join('');
    });
}
};
// --- 🖨️ PHARMACY RECEIPT PRINTING ---
window.printOrderReceipt = async (orderId) => {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (!snap.exists()) return;
    const o = snap.data();

    const win = window.open('', '', 'width=800,height=700');
    win.document.write(`
        <html>
        <head><title>Receipt - DDP Saharsa</title></head>
        <body style="font-family:sans-serif; padding:40px; color:#333;">
            <center>
                <img src="DDP logo.png" style="height:60px; margin-bottom:10px;">
                <h2 style="margin:0; color:#27ae60;">Dairy Development Programme Saharsa</h2>
                <p style="font-size:12px;">Digital Veterinary Pharmacy & Support Cell</p>
                <hr style="border:1px solid #eee; margin:20px 0;">
                <h3 style="text-transform:uppercase; letter-spacing:2px;">Medicine Purchase Receipt</h3>
            </center>

            <div style="display:flex; justify-content:space-between; margin-top:30px;">
                <div>
                    <p><b>Farmer Name:</b> ${o.customerName}</p>
                    <p><b>Phone:</b> ${o.phone}</p>
                    <p><b>Address:</b> ${o.address}</p>
                </div>
                <div style="text-align:right;">
                    <p><b>Order ID:</b> ${orderId.slice(-8).toUpperCase()}</p>
                    <p><b>Date:</b> ${o.timestamp?.toDate().toLocaleDateString()}</p>
                    <p><b>Status:</b> <span style="color:#27ae60; font-weight:bold;">${o.status.toUpperCase()}</span></p>
                </div>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-top:30px;">
                <thead>
                    <tr style="background:#f8f9fa;">
                        <th style="padding:12px; border:1px solid #ddd; text-align:left;">Medicine / Product Name</th>
                        <th style="padding:12px; border:1px solid #ddd; text-align:right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${o.items.map(item => `
                        <tr>
                            <td style="padding:12px; border:1px solid #ddd;">${item.name}</td>
                            <td style="padding:12px; border:1px solid #ddd; text-align:right;">₹${item.price}</td>
                        </tr>
                    `).join('')}
                    <tr style="background:#f1f8f5; font-weight:bold;">
                        <td style="padding:12px; border:1px solid #ddd; text-align:right;">Grand Total</td>
                        <td style="padding:12px; border:1px solid #ddd; text-align:right; font-size:18px; color:#27ae60;">₹${o.totalAmount}</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top:50px; text-align:center; font-size:12px; color:#999;">
                <p>This is a computer-generated receipt. No signature required.</p>
                <p>Support: +91 7782859925 | Saharsa, Bihar</p>
                <button onclick="window.print()" style="margin-top:20px; padding:10px 20px; background:#27ae60; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:5px;">🖨️ Print Now</button>
            </div>
        </body>
        </html>
    `);
    win.document.close();
};
// ==========================================
// --- 1. FIREBASE IMPORTS & SETUP ---
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, query, orderBy, limit, updateDoc, where, onSnapshot, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// ==========================================
// --- 🛰️ DDP SMART ALERT ENGINE (FINAL) ---
// ==========================================
const TELE_TOKEN = "8293153285:AAEUbY629TlsvlSGTCcGWxAFAHk1k_5EUho";
const TELE_CHAT_ID = "1758085069"; 

window.sendAdminAlert = async (message) => {
    const url = `https://api.telegram.org/bot${TELE_TOKEN}/sendMessage`;
    const params = {
        chat_id: TELE_CHAT_ID,
        text: message,
        parse_mode: "HTML"
    };

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
    } catch (e) {
        console.error("Telegram Alert Failed:", e);
    }
};

// ==========================================
// --- 🚨 SECURITY ---
// ==========================================
onAuthStateChanged(auth, (user) => {
    const ADMIN_PHONE = "7782859925"; 
    const userPhone = user ? user.email.split('@')[0] : null;
    if (!user || userPhone !== ADMIN_PHONE) { window.location.href = "index.html"; }
});

// ==========================================
// --- 2. ANALYTICS (FIXED REVENUE) ---
// ==========================================
async function calculateAnalytics() {
    onSnapshot(collection(db, "enrollments"), (eSnap) => {
        let revenue = 0;
        let activeCount = 0;
        eSnap.forEach(d => {
            const data = d.data();
            revenue += Number(data.feePaid || 0);
            if(data.status === 'active' || data.status === 'Active') activeCount++;
        });

        onSnapshot(collection(db, "orders"), (oSnap) => {
            let orderRevenue = 0;
            oSnap.forEach(o => {
                if(o.data().status === "Delivered") {
                    orderRevenue += Number(o.data().totalAmount || 0);
                }
            });
            const totalFinal = revenue + orderRevenue;
            if(document.getElementById('total-revenue')) document.getElementById('total-revenue').innerText = `₹${totalFinal.toLocaleString()}`;
            if(document.getElementById('total-students')) document.getElementById('total-students').innerText = activeCount;
            if(document.getElementById('total-orders')) document.getElementById('total-orders').innerText = oSnap.size;
        });
    });
}

// ==========================================
// --- 3. STUDENT & FEE MANAGEMENT ---
// ==========================================
function loadStudentManager() {
    const activeContainer = document.getElementById('admin-active-students');
    const pendingContainer = document.getElementById('admin-pending-admissions');
    if (!activeContainer || !pendingContainer) return;

    onSnapshot(collection(db, "enrollments"), (snap) => {
        let activeHtml = ""; 
        let pendingHtml = "";
        
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;
            const phone = d.userPhone || d.phone || "No Mobile";
            const status = d.status ? d.status.toLowerCase() : "";

            if (status === "active") {
                // Check if course is completed to show a badge
                const isCompleted = d.courseStatus === "Completed";
            
                activeHtml += `
                <div onclick="window.viewFullStudentDossier('${id}', '${phone}')" 
                     style="padding:15px; background:white; border:1px solid #ddd; border-radius:10px; margin-bottom:10px; cursor:pointer; border-left:5px solid ${isCompleted ? '#27ae60' : '#2980b9'};">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <b>${d.courseName}</b> ${isCompleted ? '<span style="color:#27ae60; font-size:10px; margin-left:10px;">✅ CERTIFIED</span>' : ''}<br>
                            <span style="color:#2980b9; font-weight:bold;">📱 ${phone}</span>
                        </div>
                        <span style="font-size:10px; color:#666;">VIEW DOSSIER →</span>
                    </div>
                </div>`;
            } else if (status === "pending") {
                pendingHtml += `
                <div onclick="window.viewFullStudentDossier('${id}', '${phone}')" 
                     style="padding:15px; background:#fffcf0; border:1px solid #f39c12; border-radius:10px; margin-bottom:10px; cursor:pointer; border-left:5px solid #f39c12;">
                    <div style="display:flex; justify-content:space-between;">
                        <b>${d.courseName}</b>
                        <span style="font-size:10px; background:#f39c12; color:white; padding:2px 5px; border-radius:4px;">NEW REQUEST</span>
                    </div>
                    <span style="color:#e67e22; font-weight:bold;">📱 ${phone}</span>
                    <p style="font-size:11px; margin-top:5px; color:#666;">Click to view Profile & Approve</p>
                </div>`;
            }
        });
        
        
        pendingContainer.innerHTML = pendingHtml || "<p style='font-size:12px; color:#999;'>No pending admissions.</p>";
        activeContainer.innerHTML = activeHtml || "<p style='font-size:12px; color:#999;'>No active students.</p>";
    });
}

// --- UPDATED VIEW DOSSIER (With Certificate Button) ---
window.viewFullStudentDossier = async (enrollId, phone) => {
    Swal.fire({ title: 'Loading Master File...', didOpen: () => Swal.showLoading() });

    try {
        const enrollDoc = await getDoc(doc(db, "enrollments", enrollId));
        const ed = enrollDoc.data();
        const userQuery = query(collection(db, "users"), where("userPhone", "==", phone.replace(/\D/g, "").slice(-10)));
        const userSnap = await getDocs(userQuery);
        const ud = !userSnap.empty ? userSnap.docs[0].data() : {};

        const balance = (Number(ed.totalFee) || 0) - (Number(ed.feePaid) || 0);
        const joinDate = ed.enrolledAt ? ed.enrolledAt.toDate().toLocaleDateString('en-IN') : 'N/A';
        const certDate = ed.certIssuedAt ? ed.certIssuedAt.toDate().toLocaleDateString('en-IN') : 'Not Issued';
        const isPending = ed.status && ed.status.toLowerCase() === "pending";

        const displayName = isPending ? ed.userName : (ud.name || ed.userName || 'Student');
        const displayPhoto = isPending ? (ed.studentPhoto || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png') : (ud.photoBase64 || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png');

        Swal.fire({
            title: isPending ? `Review Admission: ${displayName}` : `Student File: ${displayName}`,
            width: '800px',
            html: `
                <div style="text-align:left; font-size:13px; max-height:550px; overflow-y:auto; padding:15px; font-family:sans-serif;">
                    
                    <div style="display:flex; gap:20px; background:#f8f9fa; padding:20px; border-radius:12px; border:1px solid #ddd; margin-bottom:20px;">
                        <img src="${displayPhoto}" style="width:110px; height:110px; border-radius:12px; object-fit:cover; border:3px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                        <div style="flex:1; display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                            <h2 style="grid-column: span 2; margin:0; color:#2c3e50; font-size:18px;">${displayName}</h2>
                            <p style="grid-column: span 2; margin:5px 0; color:#2980b9; font-weight:bold;">📱 ${phone}</p>
                            <p><b>Father:</b> ${ed.fatherName || 'N/A'}</p>
                            <p><b>Mother:</b> ${ed.motherName || 'N/A'}</p>
                            <p><b>DOB:</b> ${ed.dob || 'N/A'}</p>
                            <p><b>Gender:</b> ${ed.gender || 'N/A'}</p>
                            <p style="grid-column: span 2;"><b>Aadhar:</b> ${ed.aadharNumber || 'N/A'}</p>
                        </div>
                    </div>

                    <h4 style="color:#e67e22; border-bottom:2px solid #e67e22; padding-bottom:5px;">📄 Documents for Verification</h4>
                    <div style="display:flex; gap:10px; margin-bottom:20px;">
                        <button onclick="window.viewDoc('${ed.aadharCopy}')" style="flex:1; padding:10px; background:#eee; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-weight:bold;">👁️ View Aadhar</button>
                        <button onclick="window.viewDoc('${ed.qualifCertificate}')" style="flex:1; padding:10px; background:#eee; border:1px solid #ccc; border-radius:6px; cursor:pointer; font-weight:bold;">👁️ View Certificate</button>
                    </div>

                    ${!isPending ? `
                    <h4 style="color:#2980b9; border-bottom:2px solid #2980b9; padding-bottom:5px;">📊 Academic & Examination</h4>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                        <div style="background:#f1f2f6; padding:10px; border-radius:8px;">
                            <b>Exam Score:</b> <span style="font-size:18px; color:#e67e22; font-weight:bold;">${ed.examScore || 'N/A'}</span><br>
                            <small>Pass Status: ${Number(ed.examScore) >= 40 ? '✅ Pass' : '❌ Fail/Pending'}</small>
                        </div>
                        <div style="background:#f1f2f6; padding:10px; border-radius:8px;">
                            <b>Certificate Status:</b> <span style="color:${ed.courseStatus === 'Completed' ? 'green' : 'red'};">${ed.courseStatus === 'Completed' ? 'Issued' : 'Pending'}</span><br>
                            <small>Date: ${certDate}</small>
                        </div>
                    </div>` : ''}

                    <h4 style="color:#27ae60; border-bottom:2px solid #27ae60; padding-bottom:5px;">💰 Financial Ledger</h4>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:10px;">
                        <tr style="background:#f0fff4;"><td style="padding:8px;">Total Fee</td><td style="text-align:right;"><b>₹${ed.totalFee}</b></td></tr>
                        <tr><td style="padding:8px;">Amount Paid</td><td style="text-align:right; color:green;"><b>₹${ed.feePaid || 0}</b></td></tr>
                        <tr style="border-top:2px solid #eee;"><td style="padding:8px; font-weight:bold;">Current Balance</td><td style="text-align:right; color:red;"><b>₹${balance}</b></td></tr>
                    </table>

                    <h4 style="color:#c0392b; border-bottom:2px solid #c0392b; padding-bottom:5px;">⚙️ Registrar Actions</h4>
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                        ${isPending ? `
                            <button onclick="window.adminApproveAdmission('${enrollId}', '${phone}', ${ed.totalFee})" style="padding:15px; background:#27ae60; color:white; border:none; border-radius:5px; cursor:pointer; grid-column: span 2; font-weight:bold;">✅ APPROVE</button>
                            <button onclick="window.deleteItem('enrollments', '${enrollId}')" style="padding:15px; background:#e74c3c; color:white; border:none; border-radius:5px; cursor:pointer;">❌ REJECT</button>
                        ` : `
                            <button onclick="window.recordPayment('${enrollId}', ${ed.feePaid || 0})" style="padding:10px; background:#27ae60; color:white; border:none; border-radius:5px; cursor:pointer;">Collect Fee</button>
                            <button onclick="window.updateManualScore('${enrollId}')" style="padding:10px; background:#e67e22; color:white; border:none; border-radius:5px; cursor:pointer;">Update Score</button>
                            <button onclick="window.printMarksheet('${enrollId}')" style="padding:10px; background:#34495e; color:white; border:none; border-radius:5px; cursor:pointer;">Marksheet</button>
                            
                            ${ed.courseStatus === 'Completed' ? 
                                `<button onclick="window.printCertificate('${enrollId}')" style="padding:10px; background:#9b59b6; color:white; border:none; border-radius:5px; cursor:pointer;">🎓 Certificate</button>` : 
                                `<button onclick="window.forceIssueCertificate('${enrollId}')" style="padding:10px; background:#7f8c8d; color:white; border:none; border-radius:5px; cursor:pointer;">Force Cert</button>`
                            }

                            <button onclick="window.printFeeStatement('${enrollId}')" style="padding:10px; background:#2c3e50; color:white; border:none; border-radius:5px; cursor:pointer;">Fee Bill</button>
                        `}
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true
        });
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Dossier Error', 'error');
    }
};
// Helper Function for Viewing Documents (Base64)
window.viewDoc = (base64) => {
    if(!base64 || base64.length < 10) return Swal.fire('Error', 'No document found', 'error');
    const win = window.open();
    win.document.write(`<iframe src="${base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
};
// ==========================================
// --- REGISTRAR ACTION LOGIC ---
// ==========================================

// 1. Record Installment Payment
window.recordPayment = async (enrollId, currentPaid) => {
    const { value: amount } = await Swal.fire({
        title: 'Collect Fee Installment',
        input: 'number',
        inputLabel: 'Enter amount in ₹',
        showCancelButton: true
    });

    if (amount) {
        const newTotal = Number(currentPaid) + Number(amount);
        await updateDoc(doc(db, "enrollments", enrollId), {
            feePaid: newTotal,
            lastPaymentAt: serverTimestamp()
        });
        // Inside recordPayment
let teleMsg = `💰 <b>FEE COLLECTION</b>\n\n` +
`🆔 <b>Enrollment ID:</b> ${enrollId.slice(-8)}\n` +
`💵 <b>Amount Collected:</b> ₹${amount}\n` +
`📈 <b>New Total Paid:</b> ₹${newTotal}`;
window.sendAdminAlert(teleMsg);
};
        Swal.fire('Success', `₹${amount} recorded. Total Paid: ₹${newTotal}`, 'success');
    }
    

// 2. Update Exam Score & Auto-Complete Course
window.updateManualScore = async (enrollId) => {
    const { value: score } = await Swal.fire({
        title: 'Update Exam Score',
        input: 'number',
        inputLabel: 'Enter marks (0-100)',
        showCancelButton: true
    });

    if (score !== undefined && score !== "") {
        const isPassed = Number(score) >= 40;
        await updateDoc(doc(db, "enrollments", enrollId), {
            examScore: Number(score),
            // 🔥 This line ensures the Certificate status changes to 'Issued'
            courseStatus: isPassed ? "Completed" : "Active",
            certIssuedAt: isPassed ? serverTimestamp() : null
        });
        if (isPassed) {
            window.sendAdminAlert(`🎓 <b>CERTIFICATE GENERATED (EXAM)</b>\nStudent: ${enrollId.slice(-8)}\nScore: ${score}%`);
        }
        Swal.fire('Score Updated', isPassed ? 'Student PASSED. Certificate Generated.' : 'Score updated.', 'success');
    }
    
};

// 3. Force Issue Certificate (Bypass Exam)
window.forceIssueCertificate = async (enrollId) => {
    const confirm = await Swal.fire({
        title: 'Force Issue Certificate?',
        text: "This will mark the student as Completed immediately.",
        icon: 'warning',
        showCancelButton: true
    });

    if (confirm.isConfirmed) {
        await updateDoc(doc(db, "enrollments", enrollId), {
            courseStatus: "Completed",
            certIssuedAt: serverTimestamp()
        });
        Swal.fire('Success', 'Certificate Issued.', 'success');
    }
    
    // For forceIssueCertificate
window.sendAdminAlert(`🎓 <b>CERTIFICATE ISSUED (BYPASS)</b>\nManual Override for ID: ${enrollId.slice(-8)}`);
};

// --- UPDATED MARKSHEET PRINT (Robust Fix) ---
window.printMarksheet = async (enrollId) => {
    const snap = await getDoc(doc(db, "enrollments", enrollId));
    const d = snap.data();
    if (!d) return Swal.fire('Error', 'No data found.', 'error');

    const win = window.open('', '', 'width=900,height=700');
    const studentName = (d.userName || 'Student').toUpperCase();
    
    win.document.write(`
        <html>
        <head><title>Marksheet - ${studentName}</title></head>
        <body style="font-family:sans-serif; padding:50px; border:10px double #27ae60;">
            <center>
                <img src="DDP logo.png" style="height:70px;">
                <h1 style="color:#2c3e50; margin:10px 0;">Dairy Development Programme Saharsa</h1>
                <h3 style="background:#27ae60; color:white; padding:10px; display:inline-block;">OFFICIAL MARKSHEET</h3>
            </center>
            <div style="margin-top:40px; line-height:2;">
                <p><b>Student Name:</b> ${studentName}</p>
                <p><b>Course Name:</b> ${d.courseName}</p>
                <p><b>Enrollment ID:</b> ${enrollId.slice(-8)}</p>
                <hr>
                <table style="width:100%; text-align:left; border-collapse:collapse;">
                    <tr style="background:#f4f4f4;"><th style="padding:10px;">Subject</th><th>Max Marks</th><th>Marks Obtained</th></tr>
                    <tr><td style="padding:10px;">Final Online Examination</td><td>100</td><td><b>${d.examScore || '0'}</b></td></tr>
                </table>
                <hr>
                <p><b>Final Result:</b> ${Number(d.examScore) >= 40 ? 'PASSED' : 'FAILED/PENDING'}</p>
            </div>
            <div style="margin-top:100px; display:flex; justify-content:space-between;">
                <div><p>___________________</p><p>Controller of Exams</p></div>
                <div><p>___________________</p><p>Authorized Signatory</p></div>
            </div>
            <center><button onclick="window.print()" style="margin-top:30px; padding:10px 20px; background:#2c3e50; color:white; border:none; cursor:pointer;">Print Now</button></center>
        </body></html>
    `);
    win.document.close();
};

// 5. Print Fee Bill
window.printFeeStatement = async (enrollId) => {
    const d = (await getDoc(doc(db, "enrollments", enrollId))).data();
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`
        <html><body style="font-family:sans-serif; padding:40px;">
            <center><h2>DDP Saharsa - Payment Receipt</h2></center>
            <hr>
            <p><b>Student:</b> ${d.userName}</p>
            <p><b>Course:</b> ${d.courseName}</p>
            <table style="width:100%; border:1px solid #ddd; padding:10px;">
                <tr><td>Total Course Fee:</td><td align="right">₹${d.totalFee}</td></tr>
                <tr><td>Total Amount Paid:</td><td align="right">₹${d.feePaid}</td></tr>
                <tr style="font-weight:bold; color:red;"><td>Balance Due:</td><td align="right">₹${d.totalFee - d.feePaid}</td></tr>
            </table>
            <p align="center"><button onclick="window.print()">Print Receipt</button></p>
        </body></html>
    `);
    win.document.close();
};

// --- UPDATE STUDENT CORE DATA ---
window.updateStudentData = async (enrollId, currentName, currentFather) => {
    const { value: formValues } = await Swal.fire({
        title: 'Edit Student Details',
        html:
            `<label>Full Name</label><input id="edit-name" class="swal2-input" value="${currentName}">` +
            `<label>Father's Name</label><input id="edit-father" class="swal2-input" value="${currentFather}">`,
        focusConfirm: false,
        preConfirm: () => [
            document.getElementById('edit-name').value,
            document.getElementById('edit-father').value
        ]
    });

    if (formValues) {
        const [newName, newFather] = formValues;
        await updateDoc(doc(db, "enrollments", enrollId), {
            userName: newName,
            fatherName: newFather
        });
        Swal.fire('Updated', 'Student records modified.', 'success');
    }
};

// ==========================================
// --- 4. ACTION & DATA LOADING FUNCTIONS ---
// ==========================================

window.deleteItem = async (col, id) => { 
    if(confirm("Are you sure you want to delete this permanently?")) {
        await deleteDoc(doc(db, col, id)); 
    }
};

// --- APPROVE ADMISSION (With Due Date & Discount) ---
window.adminApproveAdmission = async (id, phone, total) => {
    const { value: formValues } = await Swal.fire({
        title: 'Approve Admission',
        html:
            `<label>Initial Payment (₹)</label><input id="swal-pay" class="swal2-input" type="number" value="0">` +
            `<label>Discount/Concession (₹)</label><input id="swal-disc" class="swal2-input" type="number" value="0">` +
            `<label>Next Installment Date</label><input id="swal-date" class="swal2-input" type="date">`,
        focusConfirm: false,
        preConfirm: () => {
            return [
                document.getElementById('swal-pay').value,
                document.getElementById('swal-disc').value,
                document.getElementById('swal-date').value
            ]
        }
    });

    if (formValues) {
        const [paid, disc, dueDate] = formValues;
        const finalTotal = Number(total) - Number(disc);
        
        await updateDoc(doc(db, "enrollments", id), {
            status: "active",
            feePaid: Number(paid),
            totalFee: finalTotal, // Updated price after discount
            concession: Number(disc),
            nextDueDate: dueDate,
            unlockUntil: "", // Grace period empty by default
            approvedAt: serverTimestamp()
        });

        window.sendAdminAlert(`🎓 <b>ADMISSION APPROVED</b>\nStudent: ${phone}\nPaid: ₹${paid}\nDiscount: ₹${disc}\nNext Due: ${dueDate}`);
        Swal.fire('Approved', 'Student is now active with updated ledger.', 'success');
    }
    // Inside adminApproveAdmission
let teleMsg = `✅ <b>ADMISSION APPROVED</b>\n\n` +
`📞 <b>Student Phone:</b> ${phone}\n` +
`💰 <b>Final Fee:</b> ₹${finalTotal}\n` +
`💵 <b>Initial Paid:</b> ₹${paid}\n` +
`🎁 <b>Discount:</b> ₹${disc}\n` +
`📅 <b>Next Due:</b> ${dueDate}`;
window.sendAdminAlert(teleMsg);
};
function loadOrderHistory() {
    const table = document.getElementById('orders-table');
    if (!table) return;
    onSnapshot(query(collection(db, "orders"), orderBy("timestamp", "desc")), (snap) => {
        table.innerHTML = "";
        snap.forEach(d => {
            const o = d.data();
            const id = d.id;
            const itemsSummary = o.items.map(i => `${i.name} (x${i.qty})`).join(', ');
            let statusStyle = "background: #eee; color: #666;"; 
            if(o.status === "Processing") statusStyle = "background: #d1ecf1; color: #0c5460; font-weight: bold;";
            if(o.status === "Out for Delivery") statusStyle = "background: #fff3cd; color: #856404; font-weight: bold;";
            if(o.status === "Delivered") statusStyle = "background: #d4edda; color: #155724; font-weight: bold;";

            table.innerHTML += `
                <tr>
                    <td>${o.timestamp?.toDate().toLocaleDateString() || 'N/A'}</td>
                    <td><b>${itemsSummary}</b><br><small>Total: ₹${o.totalAmount}</small></td>
                    <td>${o.customerName}<br>${o.phone}</td>
                    <td><span style="padding:4px 8px; border-radius:4px; font-size:10px; ${statusStyle}">${o.status.toUpperCase()}</span></td>
                    <td>
                        <div style="display:flex; gap:5px;">
                            ${o.status === "Order Placed" ? `<button onclick="window.updateOrderStatus('${id}', 'Processing')" style="background:#17a2b8; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:11px;">⚙️ Process</button>` : ''}
                            ${o.status === "Processing" ? `<button onclick="window.updateOrderStatus('${id}', 'Out for Delivery')" style="background:#ffc107; color:black; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:11px;">🛵 Out for Delivery</button>` : ''}
                            ${o.status === "Out for Delivery" ? `<button onclick="window.updateOrderStatus('${id}', 'Delivered')" style="background:#28a745; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:11px;">🏁 Delivered</button>` : ''}
                            <button onclick="window.deleteItem('orders', '${id}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        });
    });
}

window.updateOrderStatus = async (id, newStatus) => {
    try {
        await updateDoc(doc(db, "orders", id), { status: newStatus });
        const orderSnap = await getDoc(doc(db, "orders", id));
        const o = orderSnap.data();
        const itemsList = o.items.map(i => `• ${i.name} (x${i.qty}) - ₹${i.price * i.qty}`).join('\n');

        let teleMsg = `🚀 <b>ORDER STATUS UPDATED: ${newStatus.toUpperCase()}</b>\n\n`;
        teleMsg += `👤 <b>Customer:</b> ${o.customerName}\n`;
        teleMsg += `📞 <b>Phone:</b> ${o.phone}\n`;
        teleMsg += `📍 <b>Address:</b> ${o.address}\n\n`;
        teleMsg += `💊 <b>Items Detail:</b>\n${itemsList}\n\n`;
        teleMsg += `💰 <b>Total Amount:</b> ₹${o.totalAmount}\n`;
        
        window.sendAdminAlert(teleMsg);
        Swal.fire('Success', `Status updated to ${newStatus}`, 'success');
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Failed to update.', 'error');
    }
};

function loadVetBookings() {
    const table = document.getElementById('vet-table-body');
    if (!table) return;

    onSnapshot(query(collection(db, "service_requests"), orderBy("timestamp", "desc")), (snap) => {
        table.innerHTML = "";
        snap.forEach(d => {
            const v = d.data();
            const id = d.id;
            const priorityColor = v.emergencyLevel === 'Critical' ? '#c0392b' : '#d35400';
            
            table.innerHTML += `
                <tr>
                    <td>
                        <b>${v.customerName}</b><br>
                        <small>📞 ${v.phone}</small><br>
                        <span style="font-size:11px; background:#f1f2f6; padding:2px 5px; border-radius:4px;">🐾 ${v.animalType}</span>
                    </td>
                    <td style="color:${priorityColor}; font-weight:bold; font-size:12px;">${v.emergencyLevel}</td>
                    <td style="font-size:11px;">${v.vetAddress}</td>
                    <td>
                        <select onchange="window.updateVetStatus('${id}', this.value)" style="padding:5px; font-size:11px; border-radius:4px; border:1px solid #ccc; width:100%;">
                            <option value="Pending" ${v.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                            <option value="Assigned" ${v.status === 'Assigned' ? 'selected' : ''}>👨‍⚕️ Assigned</option>
                            <option value="Vet Dispatched" ${v.status === 'Vet Dispatched' ? 'selected' : ''}>🛵 Dispatched</option>
                            <option value="Arrived / Treatment" ${v.status === 'Arrived / Treatment' ? 'selected' : ''}>🩺 Arrived</option>
                            <option value="Completed" ${v.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="window.deleteItem('service_requests', '${id}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
                    </td>
                </tr>`;
        });
    });
}

// Function to handle the status change
// --- Inside admin.js ---
window.updateVetStatus = async (id, newStatus) => {
    try {
        // 1. Fetch full data from database first
        const docRef = doc(db, "service_requests", id);
        const snap = await getDoc(docRef);
        
        if (!snap.exists()) return;
        const v = snap.data();

        // 2. Update the status in Firebase
        await updateDoc(docRef, { status: newStatus });

        // 3. --- FULL TELEGRAM ALERT ---
        let teleMsg = `🔄 <b>VET STATUS UPDATED</b>\n`;
        teleMsg += `📍 <b>New Status:</b> <b>${newStatus.toUpperCase()}</b>\n\n`;
        teleMsg += `👤 <b>Farmer:</b> ${v.customerName}\n`;
        teleMsg += `📞 <b>Phone:</b> ${v.phone}\n`;
        teleMsg += `🐾 <b>Animal:</b> ${v.animalType}\n`;
        teleMsg += `🏠 <b>Address:</b> ${v.vetAddress}\n`;
        teleMsg += `📝 <b>Description:</b> ${v.symptoms || 'N/A'}\n`;
        
        const gpsLink = v.gps || v.gpsLocation;
        if (gpsLink && gpsLink !== "Not provided") {
            teleMsg += `🗺️ <b>GPS:</b> <a href="${gpsLink}">View on Google Maps</a>`;
        }

        window.sendAdminAlert(teleMsg);

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Updated to ${newStatus}`,
            showConfirmButton: false,
            timer: 2000
        });

    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Failed to update status.', 'error');
    }
};

function loadBusinessEnquiries() {
    const table = document.getElementById('enquiry-table-body');
    if (!table) return;
    onSnapshot(query(collection(db, "enquiries"), orderBy("timestamp", "desc")), (snap) => {
        table.innerHTML = "";
        snap.forEach(d => {
            const e = d.data();
            table.innerHTML += `<tr><td>${e.name}</td><td>${e.phone}</td><td>${e.message}</td><td><button onclick="window.deleteItem('enquiries', '${d.id}')">Done</button></td></tr>`;
        });
    });
}

window.updateStatus = async (col, id, newStatus) => {
    await updateDoc(doc(db, col, id), { status: newStatus });
    Swal.fire('Updated', `Status marked as ${newStatus}`, 'success');
};
// --- UPDATE INSTALLMENT DATE ---
window.updateInstallmentDate = async (id) => {
    const { value: date } = await Swal.fire({ 
        title: 'Set Next Due Date', 
        input: 'date', 
        confirmButtonText: 'Update' 
    });
    if(date) {
        await updateDoc(doc(db, "enrollments", id), { nextDueDate: date });
        Swal.fire('Updated', 'New due date set.', 'success');
    }
};

// --- ADMIN GRACE PERIOD (Temporary Unlock) ---
window.adminTemporaryUnlock = async (id) => {
    const { value: days } = await Swal.fire({ 
        title: 'Grant Grace Period', 
        input: 'number', 
        inputLabel: 'Days to unlock course access:', 
        inputValue: 3 
    });
    
    if (days) {
        const unlockDate = new Date();
        unlockDate.setDate(unlockDate.getDate() + parseInt(days));
        
        await updateDoc(doc(db, "enrollments", id), { 
            unlockUntil: unlockDate.toISOString().split('T')[0] // Format: YYYY-MM-DD
        });
        
        window.sendAdminAlert(`🔑 <b>GRACE PERIOD GRANTED</b>\nStudent ID: ${id}\nUnlocked for: ${days} days`);
        Swal.fire('Temporary Unlock', `Student can access course until ${unlockDate.toLocaleDateString()}`, 'success');
    }
};
// ==========================================
// --- ACADEMY COURSE MANAGER ---
// ==========================================

// 1. Launch a New Course
window.addCourse = async () => {
    // Get values from the HTML inputs
    const cId = document.getElementById('course-id').value.trim();
    const cName = document.getElementById('course-name').value.trim();
    const cImg = document.getElementById('course-img').value.trim();
    const cTest = document.getElementById('course-test-link').value.trim();
    const cPass = document.getElementById('course-passcode').value.trim();
    const cPrice = document.getElementById('course-price').value;
    const cDisc = document.getElementById('course-discount').value;
    const cElig = document.getElementById('course-eligibility').value.trim();
    const cDur = document.getElementById('course-duration').value.trim();
    const cDesc = document.getElementById('course-desc').value.trim();

    // Validation
    if (!cId || !cName || !cPrice) {
        return Swal.fire('Error', 'Course ID, Title, and Original Price are required!', 'warning');
    }

    try {
        Swal.fire({ title: 'Launching Course...', didOpen: () => Swal.showLoading() });
        
        // Save to Firestore 'courses' collection
        await addDoc(collection(db, "courses"), {
            courseId: cId,
            title: cName,
            image: cImg,
            testLink: cTest,
            passcode: cPass,
            price: Number(cPrice),
            discountPrice: Number(cDisc) || Number(cPrice), // Fallback to original price if no discount
            eligibility: cElig,
            duration: cDur,
            description: cDesc,
            timestamp: serverTimestamp()
        });

        // For addCourse
window.sendAdminAlert(`🚀 <b>NEW COURSE LAUNCHED</b>\nTitle: ${data.title}\nID: ${data.courseId}\nFee: ₹${data.discountPrice}`);

// For Course Deletion (Inside deleteItem)
if (col === 'courses') {
    window.sendAdminAlert(`🗑️ <b>COURSE REMOVED</b>\nCourse record ${id} has been deleted from the database.`);
}
        
        Swal.fire('Success', `${cName} is now live!`, 'success');

        // Clear the form inputs after successful launch
        document.getElementById('course-id').value = '';
        document.getElementById('course-name').value = '';
        document.getElementById('course-img').value = '';
        document.getElementById('course-test-link').value = '';
        document.getElementById('course-passcode').value = '';
        document.getElementById('course-price').value = '';
        document.getElementById('course-discount').value = '';
        document.getElementById('course-eligibility').value = '';
        document.getElementById('course-duration').value = '';
        document.getElementById('course-desc').value = '';

    } catch (error) {
        console.error("Course Upload Error:", error);
        Swal.fire('Error', 'Failed to launch course. Check console.', 'error');
    }
};

// 2. Display the Live Courses in Admin Panel
function displayAdminCourses() {
    const list = document.getElementById('admin-course-list');
    if (!list) return;

    onSnapshot(collection(db, "courses"), (snap) => {
        list.innerHTML = "";
        if (snap.empty) {
            list.innerHTML = "<p style='color:#999; font-size:13px;'>No courses launched yet.</p>";
            return;
        }

        snap.forEach(docSnap => {
            const c = docSnap.data();
            list.innerHTML += `
                <div style="background:white; border:1px solid #ddd; border-radius:8px; padding:15px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <img src="${c.image}" style="width:100%; height:120px; object-fit:cover; border-radius:5px;">
                    <h4 style="margin:10px 0 5px; color:#2c3e50;">${c.title}</h4>
                    <p style="margin:0; font-size:11px; color:#666;">Course ID: <b>${c.courseId}</b></p>
                    <p style="color:#27ae60; font-weight:bold; margin:5px 0;">₹${c.discountPrice} <del style="color:#999; font-size:10px;">₹${c.price}</del></p>
                    <button onclick="window.deleteItem('courses', '${docSnap.id}')" style="background:#e74c3c; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; width:100%; font-size:12px; margin-top:10px;">
                        🗑️ Delete Course
                    </button>
                </div>
            `;
        });
    });
}
// ==========================================
// --- 5. INVENTORY & CONTENT MANAGEMENT ---
// ==========================================

// 1. Add Pharmacy Inventory
window.addStock = async () => {
    const name = document.getElementById('stock-name').value.trim();
    const image = document.getElementById('stock-image').value.trim();
    const price = document.getElementById('stock-price').value;
    const discount = document.getElementById('stock-discount').value;
    const qty = document.getElementById('stock-qty').value;
    const desc = document.getElementById('stock-desc').value.trim();
    const rx = document.getElementById('stock-rx').value === "true";

    if (!name || !price || !qty) return Swal.fire('Error', 'Name, Price, and Quantity are required!', 'warning');

    try {
        await addDoc(collection(db, "products"), {
            name, image, price: Number(price), discountPrice: Number(discount),
            currentStock: Number(qty), description: desc, requiresRx: rx,
            updatedAt: serverTimestamp()
        });
       
        Swal.fire('Success', 'Medicine added to inventory.', 'success');
        // Clear form
        ['stock-name','stock-image','stock-price','stock-discount','stock-qty','stock-desc'].forEach(id => document.getElementById(id).value = "");
    } catch (e) { Swal.fire('Error', 'Failed to add stock.', 'error'); }
    // Inside addStock
let teleMsg = `📦 <b>INVENTORY UPDATE</b>\n\n` +
`💊 <b>Item:</b> ${name}\n` +
`🔢 <b>Qty Added:</b> ${qty}\n` +
`💰 <b>Price:</b> ₹${discount}\n` +
`📜 <b>Rx Required:</b> ${rx ? "YES" : "NO"}`;
window.sendAdminAlert(teleMsg);
};

// 2. Post Official Notice
window.postNotice = async () => {
    const title = document.getElementById('notice-title').value.trim();
    const content = document.getElementById('notice-content').value.trim();

    if (!title || !content) return Swal.fire('Error', 'Title and Content are required!', 'warning');

    try {
        await addDoc(collection(db, "notices"), { title, content, timestamp: serverTimestamp() });
        Swal.fire('Published', 'Notice is now live on the homepage.', 'success');
        document.getElementById('notice-title').value = "";
        document.getElementById('notice-content').value = "";
    } catch (e) { Swal.fire('Error', 'Failed to post notice.', 'error'); }
};

// 3. Update About Section
window.updateAboutSection = async () => {
    const heading = document.getElementById('admin-about-heading').value.trim();
    const text = document.getElementById('admin-about-text').value.trim();
    const image = document.getElementById('admin-about-image').value.trim();

    try {
        await setDoc(doc(db, "settings", "about"), { heading, text, image, updatedAt: serverTimestamp() });
        Swal.fire('Saved', 'Homepage About section updated.', 'success');
    } catch (e) { Swal.fire('Error', 'Failed to save settings.', 'error'); }
};

// 4. Gallery Uploader
window.addGalleryImage = async () => {
    const url = document.getElementById('gallery-url').value.trim();
    const caption = document.getElementById('gallery-caption').value.trim();

    if (!url) return Swal.fire('Error', 'Image URL is required!', 'warning');

    try {
        await addDoc(collection(db, "gallery"), { url, caption, timestamp: serverTimestamp() });
        Swal.fire('Uploaded', 'Photo added to gallery.', 'success');
        document.getElementById('gallery-url').value = "";
        document.getElementById('gallery-caption').value = "";
    } catch (e) { Swal.fire('Error', 'Failed to upload.', 'error'); }
};

// 5. Course Creator
window.addCourse = async () => {
    const data = {
        courseId: document.getElementById('course-id').value,
        title: document.getElementById('course-name').value,
        image: document.getElementById('course-img').value,
        testLink: document.getElementById('course-test-link').value,
        passcode: document.getElementById('course-passcode').value,
        price: Number(document.getElementById('course-price').value),
        discountPrice: Number(document.getElementById('course-discount').value),
        eligibility: document.getElementById('course-eligibility').value,
        duration: document.getElementById('course-duration').value,
        description: document.getElementById('course-desc').value,startDate: document.getElementById('course-start').value,
        endDate: document.getElementById('course-end').value,
        syllabus: document.getElementById('course-syllabus').value,
        benefits: document.getElementById('course-benefits').value,
        
        timestamp: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "courses"), data);
        Swal.fire('Launched', 'Detailed Batch is now live!', 'success');
    } catch (e) { Swal.fire('Error', 'Launch failed', 'error'); }
    
};

// 6. Display Inventory for Management
function displayAdminStock() {
    const list = document.getElementById('admin-stock-list');
    if (!list) return;
    onSnapshot(collection(db, "products"), (snap) => {
        list.innerHTML = "";
        snap.forEach(dDoc => {
            const p = dDoc.data();
            list.innerHTML += `
                <div style="background:white; border:1px solid #ddd; border-radius:8px; padding:10px; text-align:center;">
                    <img src="${p.image}" style="width:100%; height:100px; object-fit:cover;">
                    <h4 style="margin:5px 0;">${p.name}</h4>
                    <p>Stock: ${p.currentStock}</p>
                    <button onclick="window.deleteItem('products', '${dDoc.id}')" style="color:red; background:none; border:none; cursor:pointer;">Delete</button>
                </div>`;
        });
    });
}
// Add this to admin.js to handle the Gallery Upload button
window.addGalleryImage = async () => {
    const url = document.getElementById('gallery-url').value.trim();
    const caption = document.getElementById('gallery-caption').value.trim();

    if (!url) {
        return Swal.fire('Error', 'Please provide an Image URL', 'warning');
    }

    try {
        Swal.fire({ title: 'Uploading to Gallery...', didOpen: () => Swal.showLoading() });
        
        await addDoc(collection(db, "gallery"), {
            url: url,
            caption: caption,
            timestamp: serverTimestamp()
        });

        Swal.fire('Success', 'Photo added to public gallery!', 'success');
        
        // Clear inputs
        document.getElementById('gallery-url').value = "";
        document.getElementById('gallery-caption').value = "";
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Failed to upload image.', 'error');
    }
};
// --- Place this at the end of admin.js ---

// Step 2: Logic to List Photos
function displayAdminGallery() {
    const galleryContainer = document.getElementById('admin-gallery-list');
    if (!galleryContainer) return;

    onSnapshot(query(collection(db, "gallery"), orderBy("timestamp", "desc")), (snapshot) => {
        if (snapshot.empty) {
            galleryContainer.innerHTML = "<p>No photos found in the gallery.</p>";
            return;
        }

        galleryContainer.innerHTML = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return `
                <div style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; text-align: center; background: #f9f9f9;">
                    <img src="${data.url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">
                    <button onclick="window.deleteGalleryPhoto('${docSnap.id}')" 
                            style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
                        🗑️ Delete
                    </button>
                </div>
            `;
        }).join('');
    });
}

// Step 3: Deletion Function
window.deleteGalleryPhoto = async (photoId) => {
    const result = await Swal.fire({
        title: 'Delete Photo?',
        text: "This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#34495e',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "gallery", photoId));
            Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', 'Failed to delete. Please try again.', 'error');
        }
    }
};
// --- Add to admin.js ---
function loadGrievances() {
    const table = document.getElementById('grievance-table-body');
    if (!table) return;

    onSnapshot(query(collection(db, "grievances"), orderBy("timestamp", "desc")), (snap) => {
        table.innerHTML = "";
        snap.forEach(d => {
            const g = d.data();
            table.innerHTML += `
                <tr>
                    <td><b>${g.name}</b><br><small>${g.phone}</small></td>
                    <td>${g.subject}</td>
                    <td>
                        <select onchange="window.updateGrievanceStatus('${d.id}', this.value)" style="padding:5px; border-radius:4px;">
                            <option value="Pending" ${g.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Under Investigation" ${g.status === 'Under Investigation' ? 'selected' : ''}>Under Investigation</option>
                            <option value="Resolved" ${g.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="window.printGrievance('${d.id}')" style="background:#34495e; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">👁️ View/Print</button>
                    </td>
                </tr>`;
        });
    });
}
window.printGrievance = async (id) => {
    const snap = await getDoc(doc(db, "grievances", id));
    if(!snap.exists()) return;
    const g = snap.data();
    
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`
        <html><body style="font-family:sans-serif; padding:40px; border:1px solid #eee;">
            <center>
                <img src="DDP logo.png" style="height:50px;">
                <h2 style="color:#c0392b;">DDP Saharsa - Grievance Report</h2>
            </center>
            <hr>
            <p><b>Grievance ID:</b> ${id}</p>
            <p><b>Status:</b> ${g.status}</p>
            <p><b>Category:</b> ${g.category}</p>
            <p><b>Farmer:</b> ${g.name} (${g.phone})</p>
            <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin-top:20px;">
                <b>Message:</b><br>${g.message}
            </div>
            <p style="margin-top:30px; font-size:11px; color:#666;">DDP Saharsa Digital Cell - ${new Date().toLocaleString()}</p>
            <button onclick="window.print()" style="margin-top:20px; padding:10px; background:#2c3e50; color:white; border:none; cursor:pointer;">Print Page</button>
        </body></html>
    `);
    win.document.close();
};
// --- Add to admin.js ---

function loadGrievanceManager() {
    const tableBody = document.getElementById('grievance-table-body');
    if (!tableBody) return;

    // Real-time listener for grievances
    onSnapshot(query(collection(db, "grievances"), orderBy("timestamp", "desc")), (snap) => {
        tableBody.innerHTML = "";
        
        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">No complaints found.</td></tr>`;
            return;
        }

        snap.forEach(docSnap => {
            const g = docSnap.data();
            const id = docSnap.id;
            const status = g.status || "Pending";
            
            tableBody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px;">
                        <div style="font-weight:bold; color:#2c3e50;">${g.name}</div>
                        <div style="font-size:12px; color:#27ae60;">📞 ${g.phone}</div>
                    </td>
                    <td style="padding:12px;">
                        <span style="font-size:11px; background:#f1f2f6; padding:3px 8px; border-radius:4px; font-weight:bold;">${g.category}</span>
                    </td>
                    <td style="padding:12px;">
                        <select onchange="window.updateGrievanceStatus('${id}', this.value)" 
                                style="padding:6px; border-radius:6px; border:1px solid #ddd; font-size:12px; background:${status === 'Resolved' ? '#e8f5e9' : '#fff3e0'};">
                            <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                            <option value="Under Review" ${status === 'Under Review' ? 'selected' : ''}>🔍 Under Review</option>
                            <option value="Resolved" ${status === 'Resolved' ? 'selected' : ''}>✅ Resolved</option>
                        </select>
                    </td>
                    <td style="padding:12px; display:flex; gap:10px;">
                        <button onclick="window.printGrievance('${id}')" style="background:#34495e; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:12px;">👁️ View/Print</button>
                        <button onclick="window.deleteItem('grievances', '${id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:16px;">🗑️</button>
                    </td>
                </tr>
            `;
        });
    });
}
// --- Add to admin.js ---

window.updateGrievanceStatus = async (id, newStatus) => {
    try {
        await updateDoc(doc(db, "grievances", id), { 
            status: newStatus,
            resolvedAt: serverTimestamp() 
        });

        // Inside updateGrievanceStatus
let teleMsg = `🚩 <b>GRIEVANCE STATUS CHANGE</b>\n` +
`ID: ${id.slice(-5)}\n` +
`New Status: <b>${newStatus.toUpperCase()}</b>`;
window.sendAdminAlert(teleMsg);

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Updated: ${newStatus}`,
            showConfirmButton: false,
            timer: 1500
        });
    } catch (e) {
        Swal.fire('Error', 'Failed to update grievance status.', 'error');
    }
};

// --- ROBUST CERTIFICATE PRINTING ---
window.printCertificate = async (enrollId) => {
    const snap = await getDoc(doc(db, "enrollments", enrollId));
    const d = snap.data();
    
    if (!d) return Swal.fire('Error', 'No enrollment data found.', 'error');
    if (d.courseStatus !== "Completed") {
        return Swal.fire('Error', 'Certificate not yet issued. Ensure student has passed the exam.', 'error');
    }

    // 1. Create the window
    const win = window.open('', '', 'width=1100,height=850');
    
    // 2. Check for popup blockers
    if (!win) return Swal.fire('Blocked', 'Please allow popups for this site to view certificates.', 'warning');

    // 3. Prepare safe variables
    const studentName = (d.userName || 'Student').toUpperCase();
    const courseTitle = d.courseName || 'Professional Course';
    const issueDate = d.certIssuedAt ? d.certIssuedAt.toDate().toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    // 4. Write Content
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Certificate - ${studentName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Playfair+Display:wght@700&display=swap');
                body { margin: 0; padding: 0; background: #f0f0f0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                .cert-border { width: 950px; height: 650px; background: #fffdf5; padding: 30px; border: 15px solid #2c3e50; box-sizing: border-box; position: relative; }
                .cert-inner { border: 5px solid #e67e22; height: 100%; width: 100%; box-sizing: border-box; padding: 40px; text-align: center; position: relative; }
                .logo { height: 80px; margin-bottom: 10px; }
                h1 { font-family: 'Playfair Display', serif; font-size: 50px; color: #2c3e50; margin: 10px 0; }
                .sub-text { font-size: 20px; color: #7f8c8d; margin: 20px 0; }
                .student-name { font-family: 'Pinyon Script', cursive; font-size: 65px; color: #e67e22; margin: 10px 0; border-bottom: 1px solid #ddd; display: inline-block; padding: 0 40px; }
                .course-name { font-weight: bold; font-size: 26px; color: #2c3e50; margin: 10px 0; }
                .footer-sigs { margin-top: 60px; display: flex; justify-content: space-around; }
                .sig-box { border-top: 1px solid #2c3e50; width: 200px; padding-top: 10px; font-weight: bold; font-size: 14px; }
                @media print { .print-btn { display: none; } body { background: white; } }
            </style>
        </head>
        <body>
            <div class="cert-border">
                <div class="cert-inner">
                    <img src="DDP logo.png" class="logo">
                    <p style="margin:0; font-weight:bold; letter-spacing:2px; color:#2980b9;">DAIRY DEVELOPMENT PROGRAMME SAHARSA</p>
                    
                    <h1>Certificate of Excellence</h1>
                    <p class="sub-text">This is to certify that</p>
                    
                    <div class="student-name">${studentName}</div>
                    
                    <p class="sub-text">has successfully completed the professional training in</p>
                    <div class="course-name">${courseTitle}</div>
                    
                    <p style="margin-top:20px;">Issued on: <b>${issueDate}</b> | ID: <b>${enrollId.slice(-8).toUpperCase()}</b></p>

                    <div class="footer-sigs">
                        <div class="sig-box">Program Director</div>
                        <div class="sig-box">Authorized Signatory</div>
                    </div>

                    <button class="print-btn" onclick="window.print()" style="margin-top:30px; padding:10px 25px; background:#2980b9; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">🖨️ Print Certificate</button>
                </div>
            </div>
        </body>
        </html>
    `);
    
    win.document.close();
};

// 5. Print Fee Statement
window.printFeeStatement = async (enrollId) => {
    const d = (await getDoc(doc(db, "enrollments", enrollId))).data();
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`<html><body style="padding:40px; font-family:sans-serif;"><h2>Fee Statement: ${d.userName}</h2><hr><p>Total: ₹${d.totalFee}</p><p>Paid: ₹${d.feePaid}</p><p style="color:red;">Balance: ₹${d.totalFee - d.feePaid}</p><button onclick="window.print()">Print</button></body></html>`);
    win.document.close();
};


// --- Missing functions like Record Payment, Print Marksheet etc should follow here ---

window.onload = async () => {
    calculateAnalytics();
    loadStudentManager();
    loadOrderHistory();
    loadVetBookings();
    loadBusinessEnquiries();
    loadGrievanceManager();
    displayAdminGallery();
    displayAdminCourses(); // <--- ADD THIS LINE HERE
    displayAdminStock(); // Start listening to stock

    // Pre-load current About section content into inputs
    const aboutDoc = await getDoc(doc(db, "settings", "about"));
    if (aboutDoc.exists()) {
        const d = aboutDoc.data();
        document.getElementById('admin-about-heading').value = d.heading || "";
        document.getElementById('admin-about-text').value = d.text || "";
        document.getElementById('admin-about-image').value = d.image || "";
    }
};
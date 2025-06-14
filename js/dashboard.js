import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";

// ---- Cloudinary config ----
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/<your-cloud-name>/image/upload"; // <- Change this
const CLOUDINARY_UPLOAD_PRESET = "<your-upload-preset>"; // <- Change this

// ---- Firebase config ----
const firebaseConfig = {
    apiKey: "AIzaSyBz4CJRYO-HjNs-77vyxA-Bdcf4ihSeH5o",
    authDomain: "task-track---login-4b5f9.firebaseapp.com",
    projectId: "task-track---login-4b5f9",
    storageBucket: "task-track---login-4b5f9.appspot.com",
    messagingSenderId: "898650919931",
    appId: "1:898650919931:web:8daf17dc06b9fc5d62715e",
    measurementId: "G-47J31JQ3JH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Populate "Assign To" with employees ---
async function populateEmployeesDropdown() {
    const user = auth.currentUser;
    const assignSelect = document.getElementById('task-assign');
    assignSelect.innerHTML = `<option>Choose employee</option>`;
    if (!user) return;
    const employeesSnap = await getDocs(collection(db, "users", user.uid, "employees"));
    employeesSnap.forEach(docSnap => {
        const emp = docSnap.data();
        const option = document.createElement("option");
        option.value = docSnap.id;
        option.textContent = emp.name;
        assignSelect.appendChild(option);
    });
}
auth.onAuthStateChanged(user => { if (user) populateEmployeesDropdown(); });
const createTaskNav = document.querySelector('a[onclick="showSection(\'createTask\')"]');
if (createTaskNav) createTaskNav.addEventListener('click', populateEmployeesDropdown);

// --- Handle Add Employee Form ---
const addUserForm = document.getElementById('add-user-form');
if (addUserForm) {
    addUserForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const user = auth.currentUser;
        if (!user) { alert("You must be logged in to add employees."); return; }
        const name = document.getElementById('emp-name').value.trim();
        const position = document.getElementById('emp-position').value.trim();
        const age = parseInt(document.getElementById('emp-age').value, 10);
        const gender = document.getElementById('emp-gender').value;

        try {
            await addDoc(collection(db, "users", user.uid, "employees"), {
                name, position, age, gender, createdAt: new Date()
            });
            alert("Employee added successfully!");
            event.target.reset();
            populateEmployeesDropdown();
        } catch (error) {
            alert("Error adding employee: " + error.message);
        }
    });
}

// --- Handle Create Task Form ---
const createTaskForm = document.getElementById('create-task-form');
if (createTaskForm) {
    createTaskForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const user = auth.currentUser;
        if (!user) { alert("You must be logged in to create tasks."); return; }
        const title = document.getElementById('task-title').value.trim();
        const desc = document.getElementById('task-desc').value.trim();
        const assignToId = document.getElementById('task-assign').value;
        const dueDate = document.getElementById('task-due').value;

        if (!assignToId || assignToId === "Choose employee") {
            alert("Please select an employee to assign.");
            return;
        }

        try {
            await addDoc(collection(db, "users", user.uid, "tasks"), {
                title,
                description: desc,
                assignToId,
                dueDate,
                createdAt: new Date(),
                status: "Unfinished",
                evidenceUrl: "",
                doneDate: "" // initially empty
            });
            alert("Task created successfully!");
            event.target.reset();
        } catch (error) {
            alert("Error creating task: " + error.message);
        }
    });
}

// --- Helper for date & time formatting ---
function formatDateTime(date) {
    if (!date) return "";
    let d;
    if (typeof date === "string") {
        d = new Date(date);
    } else if (typeof date.toDate === "function") {
        d = date.toDate();
    } else {
        d = date;
    }
    // Format: YYYY-MM-DD HH:mm
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mins}`;
}

// --- Render All Tasks (with Cloudinary upload and edit status) ---
const allTasksNav = document.querySelector('a[onclick="showSection(\'allTasks\')"]');
if (allTasksNav) allTasksNav.addEventListener('click', subscribeAndRenderTasks);

let unsubscribeTasksListener = null;
function subscribeAndRenderTasks() {
    const user = auth.currentUser;
    if (!user) return;
    if (unsubscribeTasksListener) unsubscribeTasksListener();
    unsubscribeTasksListener = onSnapshot(collection(db, "users", user.uid, "tasks"), snapshot => {
        renderTasksTable(snapshot.docs, user);
    });
}
auth.onAuthStateChanged(user => { if (user) subscribeAndRenderTasks(); });

function formatDate(date) {
    if (!date) return "";
    if (typeof date === "string") return date;
    if (typeof date.toDate === "function") {
        const d = date.toDate();
        return d.toISOString().split("T")[0];
    }
    return date;
}

async function renderTasksTable(taskDocs, user) {
    const tableBody = document.getElementById('tasks-table-body');
    tableBody.innerHTML = ""; // Always clear before rendering
    // Get all employees for ID-to-name mapping
    const employeesSnap = await getDocs(collection(db, "users", user.uid, "employees"));
    const employees = {};
    employeesSnap.forEach(doc => {
        employees[doc.id] = doc.data().name;
    });

    for (const docSnap of taskDocs) {
        const task = docSnap.data();
        const taskId = docSnap.id;
        if (task.status === "Done") continue; // Don't show in All Tasks if done!
        const assignedName = employees[task.assignToId] || "Unknown";
        const row = document.createElement('tr');

        // Evidence cell
        let evidenceCell = "";
        if (task.evidenceUrl) {
            evidenceCell = `
                <a href="${task.evidenceUrl}" target="_blank" rel="noopener noreferrer" class="evidence-link">
                    View Evidence
                </a>
            `;
        } else {
            evidenceCell = `<input type="file" accept="image/*,.pdf" data-taskid="${taskId}">`;
        }

        row.innerHTML = `
            <td>${task.title || ""}</td>
            <td>${assignedName}</td>
            <td>${formatDate(task.dueDate)}</td>
            <td>
                <select data-edit-status data-taskid="${taskId}" disabled>
                    <option value="Unfinished"${task.status === "Unfinished" ? " selected" : ""}>Unfinished</option>
                    <option value="Done"${task.status === "Done" ? " selected" : ""}>Done</option>
                </select>
            </td>
            <td>${evidenceCell}</td>
            <td>
                <button class="edit-btn primary-btn" data-taskid="${taskId}">Edit</button>
            </td>
        `;

        // Add event listener for file input if not uploaded yet
        const temp = document.createElement('tbody');
        temp.appendChild(row);
        const fileInput = temp.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                // Upload to Cloudinary
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                try {
                    const res = await fetch(CLOUDINARY_UPLOAD_URL, {
                        method: "POST",
                        body: formData
                    });
                    const data = await res.json();
                    if (data.secure_url) {
                        // Save evidence URL to Firestore
                        await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
                            evidenceUrl: data.secure_url
                        });
                        alert("Evidence uploaded!");
                    } else {
                        alert("Cloudinary upload failed.");
                    }
                } catch (err) {
                    alert("Failed to upload evidence: " + err.message);
                }
            });
        }

        // Add edit functionality for status
        const editBtn = temp.querySelector('.edit-btn');
        const statusSelect = temp.querySelector('select[data-edit-status]');
        let editing = false;
        if (editBtn && statusSelect) {
            editBtn.addEventListener('click', async () => {
                if (!editing) {
                    statusSelect.disabled = false;
                    editBtn.textContent = "Save";
                    editing = true;
                } else {
                    statusSelect.disabled = true;
                    editBtn.textContent = "Edit";
                    editing = false;
                    // Save status change to Firestore
                    const newStatus = statusSelect.value;
                    if (newStatus === "Done") {
                        // Set doneDate to now with time
                        const now = new Date();
                        const yyyy = now.getFullYear();
                        const mm = String(now.getMonth() + 1).padStart(2, '0');
                        const dd = String(now.getDate()).padStart(2, '0');
                        const hh = String(now.getHours()).padStart(2, '0');
                        const mins = String(now.getMinutes()).padStart(2, '0');
                        const doneDate = `${yyyy}-${mm}-${dd} ${hh}:${mins}`;
                        await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
                            status: newStatus,
                            doneDate: doneDate
                        });
                    } else {
                        // Remove doneDate if reverting to unfinished
                        await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
                            status: newStatus,
                            doneDate: ""
                        });
                    }
                    alert("Task status updated!");
                }
            });
        }

        tableBody.appendChild(row);
    }

    document.querySelectorAll('.evidence-link').forEach(link => {
        link.addEventListener('click', function(e) { /* default open in new tab */ });
    });
}

// --- Completed Tasks Table (with edit to mark as unfinished, and button design matches All Tasks) ---
const completedTasksNav = document.querySelector('a[onclick="showSection(\'completedTasks\')"]');
if (completedTasksNav) completedTasksNav.addEventListener('click', subscribeAndRenderCompletedTasks);

let unsubscribeCompletedTasksListener = null;
function subscribeAndRenderCompletedTasks() {
    const user = auth.currentUser;
    if (!user) return;
    if (unsubscribeCompletedTasksListener) unsubscribeCompletedTasksListener();
    unsubscribeCompletedTasksListener = onSnapshot(collection(db, "users", user.uid, "tasks"), snapshot => {
        const completed = snapshot.docs.filter(doc => doc.data().status === "Done");
        renderCompletedTasksTable(completed, user);
    });
}
async function renderCompletedTasksTable(taskDocs, user) {
    const tableBody = document.getElementById('completed-tasks-table-body');
    tableBody.innerHTML = "";
    const employeesSnap = await getDocs(collection(db, "users", user.uid, "employees"));
    const employees = {};
    employeesSnap.forEach(doc => {
        employees[doc.id] = doc.data().name;
    });

    for (const docSnap of taskDocs) {
        const task = docSnap.data();
        const taskId = docSnap.id;
        const assignedName = employees[task.assignToId] || "Unknown";
        let evidenceCell = task.evidenceUrl
            ? `<a href="${task.evidenceUrl}" target="_blank" rel="noopener noreferrer" class="evidence-link">View Evidence</a>`
            : "";
        // Show doneDate & time (if missing, fallback to dueDate)
        const showDate = task.doneDate ? task.doneDate : formatDateTime(task.dueDate);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.title || ""}</td>
            <td>${assignedName}</td>
            <td>${showDate}</td>
            <td>
                <select data-edit-status-done data-taskid="${taskId}" disabled>
                    <option value="Unfinished"${task.status === "Unfinished" ? " selected" : ""}>Unfinished</option>
                    <option value="Done"${task.status === "Done" ? " selected" : ""}>Done</option>
                </select>
            </td>
            <td>${evidenceCell}</td>
            <td>
                <button class="edit-btn-done primary-btn" data-taskid="${taskId}">Edit</button>
            </td>
        `;

        // Add edit functionality for status (allow marking as unfinished)
        const temp = document.createElement('tbody');
        temp.appendChild(row);
        const editBtn = temp.querySelector('.edit-btn-done');
        const statusSelect = temp.querySelector('select[data-edit-status-done]');
        let editing = false;
        if (editBtn && statusSelect) {
            editBtn.addEventListener('click', async () => {
                if (!editing) {
                    statusSelect.disabled = false;
                    editBtn.textContent = "Save";
                    editing = true;
                } else {
                    statusSelect.disabled = true;
                    editBtn.textContent = "Edit";
                    editing = false;
                    // Save status change to Firestore
                    const newStatus = statusSelect.value;
                    if (newStatus === "Done") {
                        // Set doneDate to now with time
                        const now = new Date();
                        const yyyy = now.getFullYear();
                        const mm = String(now.getMonth() + 1).padStart(2, '0');
                        const dd = String(now.getDate()).padStart(2, '0');
                        const hh = String(now.getHours()).padStart(2, '0');
                        const mins = String(now.getMinutes()).padStart(2, '0');
                        const doneDate = `${yyyy}-${mm}-${dd} ${hh}:${mins}`;
                        await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
                            status: newStatus,
                            doneDate: doneDate
                        });
                    } else {
                        // Remove doneDate if reverting to unfinished
                        await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
                            status: newStatus,
                            doneDate: ""
                        });
                    }
                    alert("Task status updated!");
                }
            });
        }

        tableBody.appendChild(row);
    }

    document.querySelectorAll('.evidence-link').forEach(link => {
        link.addEventListener('click', function(e) { /* default open in new tab */ });
    });
}
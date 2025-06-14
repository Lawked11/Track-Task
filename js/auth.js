// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-analytics.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBz4CJRYO-HjNs-77vyxA-Bdcf4ihSeH5o",
    authDomain: "task-track---login-4b5f9.firebaseapp.com",
    projectId: "task-track---login-4b5f9",
    storageBucket: "task-track---login-4b5f9.firebasestorage.app",
    messagingSenderId: "898650919931",
    appId: "1:898650919931:web:8daf17dc06b9fc5d62715e",
    measurementId: "G-47J31JQ3JH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// SIGNUP Handler
export async function handleSignup(event) {
    event.preventDefault();

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Add user to Firestore collection "users"
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            createdAt: new Date()
        });

        alert("Signup successful! Please log in.");
        window.location.href = "login.html"; // Redirect to login
    } catch (error) {
        alert("Signup failed: " + error.message);
    }
}

// Optional: LOGIN handler (for login.html form)
export async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem("uid", userCredential.user.uid);
        window.location.href = "dashboard.html";
    } catch (error) {
        alert("Login failed: " + error.message);
    }
}
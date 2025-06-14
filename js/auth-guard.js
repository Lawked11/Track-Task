// auth-guard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";

// Firebase configuration (must match your other config)
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
const auth = getAuth(app);

function redirectToLoginIfNotAuth() {
    onAuthStateChanged(auth, user => {
        // If not logged in, redirect to login.html
        if (!user) {
            window.location.href = "login.html";
        }
    });
}

// For logout button global usage
window.logout = function() {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
};

redirectToLoginIfNotAuth();
// Vault 28 - Application Logic Engine

// --- FIREBASE CONFIGURATION ---
// To connect a real-time cloud database, paste your Firebase Web API config here:
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDGtZv3LXchFGTQuTPDRIF0UDk_G46hTz4",
    authDomain: "vault28-ba268.firebaseapp.com",
    projectId: "vault28-ba268",
    storageBucket: "vault28-ba268.firebasestorage.app",
    messagingSenderId: "343002100571",
    appId: "1:343002100571:web:28c955ba5c4e997ad6a07e",
    measurementId: "G-X2FL2Y1GTS"
};

// Check if Firebase keys are provided
const isFirebaseActive = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.trim() !== "");
let db = null;
let collectionsListener = null; // Store Firestore collection listener reference

if (isFirebaseActive) {
    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
    } catch (err) {
        console.error("Firebase Initialization Error:", err);
    }
}

// Local variables
let collections = [];
let tempCards = []; // Temporary inventory for the submission wizard
let currentActiveRole = 'seller'; // 'seller' or 'buyer'
let selectedCollectionId = null;
let uploadedCardImageBase64 = null;
let authModalMode = 'login'; // 'login' or 'signup'

// Default Mock Data
const DEFAULT_COLLECTIONS = [
    {
        id: "col-jordan-1986",
        title: "1986 Fleer NBA Rookie Hunt",
        description: "This is a collection of classic 1980s basketball cards. Includes the legendary 1986 Fleer Michael Jordan Rookie Card in amazing condition, plus Spud Webb and Johnny Moore rookies. Looking to negotiate a fair deal!",
        sport: "Basketball",
        sellerName: "Luke S.",
        sellerEmail: "luke.s@gmail.com",
        sellerUid: "sandbox-luke-uid",
        askingPrice: 5400,
        offerPrice: 4800,
        status: "Offer Made",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
        cards: [
            {
                player: "Michael Jordan",
                brand: "Fleer Rookie #57",
                year: 1986,
                grade: "PSA 8 Near-Mint/Mint",
                image: "" // Generated dynamically
            },
            {
                player: "Spud Webb",
                brand: "Fleer Rookie #120",
                year: 1986,
                grade: "PSA 9 Mint",
                image: "" // Generated dynamically
            },
            {
                player: "Johnny Moore",
                brand: "Fleer Rookie #77",
                year: 1986,
                grade: "PSA 8 Near-Mint/Mint",
                image: "" // Generated dynamically
            }
        ],
        messages: [
            {
                sender: "seller",
                senderName: "Luke S.",
                text: "Hey there! Submitted my 86 Fleer basketball lot. That Jordan is exceptionally clean.",
                timestamp: new Date(Date.now() - 3600000 * 20).toISOString()
            },
            {
                sender: "buyer",
                senderName: "V28 Buying Desk",
                text: "Hi Luke, thanks for submitting this awesome Michael Jordan rookie. The centering looks slightly off-center (around 65/35), but the corners are extremely sharp. No chipping on the borders.",
                timestamp: new Date(Date.now() - 3600000 * 18).toISOString()
            },
            {
                sender: "seller",
                senderName: "Luke S.",
                text: "Appreciate the honest review. Yes, it has been in a soft sleeve and top loader since the late 80s.",
                timestamp: new Date(Date.now() - 3600000 * 17).toISOString()
            },
            {
                sender: "buyer",
                senderName: "V28 Buying Desk",
                text: "Based on recent auction prices for a PSA 8 Jordan, we can make you a package offer of $4,800 for the whole collection including Webb and Moore.",
                timestamp: new Date(Date.now() - 3600000 * 16).toISOString()
            },
            {
                sender: "system",
                senderName: "System",
                text: "Vault 28 Buying Desk made a counter offer of $4,800.",
                timestamp: new Date(Date.now() - 3600000 * 16).toISOString()
            }
        ]
    },
    {
        id: "col-mahomes-modern",
        title: "Modern Patrick Mahomes Gridiron Gems",
        description: "High-grade Patrick Mahomes cards, including his 2017 Donruss Optic Rookie Card. Kept in a secure environment. Selling to downsize my NFL collection.",
        sport: "Football",
        sellerName: "Marcus T.",
        sellerEmail: "marcus.t@gmail.com",
        sellerUid: "sandbox-marcus-uid",
        askingPrice: 2100,
        offerPrice: 0,
        status: "Pending Review",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        cards: [
            {
                player: "Patrick Mahomes II",
                brand: "Donruss Optic Rookie #177",
                year: 2017,
                grade: "PSA 10 Gem Mint",
                image: "" // Generated dynamically
            },
            {
                player: "Patrick Mahomes II",
                brand: "Panini Prizm Soph Year #1",
                year: 2018,
                grade: "PSA 9 Mint",
                image: "" // Generated dynamically
            }
        ],
        messages: [
            {
                sender: "seller",
                senderName: "Marcus T.",
                text: "Hey, let know what you think of this Mahomes lot. The Optic Rookie is in pristine condition.",
                timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
            },
            {
                sender: "system",
                senderName: "System",
                text: "Marcus T. submitted this collection for review.",
                timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
            }
        ]
    }
];

// Helper to generate dynamic canvas card mockup image
function generateCardMockupImage(player, year, brand, sport) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    
    // Determine gradient colors based on player name (sports team themed colors)
    let colors = ['#1e293b', '#0f172a'];
    let accentColor = '#3b82f6';
    const p = player.toLowerCase();
    
    if (p.includes('jordan')) {
        colors = ['#ce1141', '#000000']; // Bulls Red/Black
        accentColor = '#fcd34d'; // Gold highlight
    } else if (p.includes('mahomes')) {
        colors = ['#e31837', '#ffb612']; // Chiefs Red/Yellow
        accentColor = '#ffffff';
    } else if (p.includes('webb')) {
        colors = ['#c8102e', '#27251f']; // Hawks Red/Black
        accentColor = '#fdb927';
    } else if (p.includes('moore')) {
        colors = ['#06b6d4', '#0f172a']; // Cyan/Dark Navy
        accentColor = '#0df3a3';
    } else if (p.includes('lebron') || p.includes('james')) {
        colors = ['#552583', '#fdb927']; // Lakers Purple/Gold
        accentColor = '#ffffff';
    } else if (sport === 'Baseball') {
        colors = ['#0a2351', '#002d62']; // Baseball Blue
        accentColor = '#fbbf24';
    } else if (sport === 'Soccer') {
        colors = ['#004d98', '#a50044']; // Barcelona Blue/Red
        accentColor = '#edbb00';
    } else if (sport.includes('Pokemon')) {
        colors = ['#ffcb05', '#2a75d3']; // Pokemon Yellow/Blue
        accentColor = '#ff1f1f';
    } else {
        colors = ['#1e1b4b', '#4c1d95'];
        accentColor = '#0df3a3';
    }
    
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 300, 420);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 300, 420);
    
    // Draw visual textures
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(150, 180, 100, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(150, 180, 70, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(30, 290);
    ctx.lineTo(270, 290);
    ctx.stroke();

    // Stadium lighting effects
    const glowGrad = ctx.createRadialGradient(150, 100, 10, 150, 100, 150);
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(150, 100, 150, 0, Math.PI*2);
    ctx.fill();
    
    // Outer Metallic Frame
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 15, 270, 390);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, 260, 380);
    
    // Holographic background text/number
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.font = 'bold 150px "Outfit"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('28', 150, 180);
    
    // Brand header
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '800 11px "Outfit"';
    ctx.textAlign = 'center';
    ctx.fillText(brand.toUpperCase(), 150, 42);
    
    // Inner card art border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(30, 60, 240, 220);
    
    // Draw abstract player avatar shape
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(150, 150, 40, 0, Math.PI * 2); // Head
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(100, 260);
    ctx.quadraticCurveTo(100, 200, 150, 200);
    ctx.quadraticCurveTo(200, 200, 200, 260);
    ctx.closePath();
    ctx.fill();

    // Player metadata text boxes
    ctx.fillStyle = 'rgba(6, 9, 19, 0.85)';
    ctx.fillRect(30, 305, 240, 75);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(30, 305, 240, 75);
    
    // Player Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Outfit"';
    ctx.textAlign = 'center';
    ctx.fillText(player, 150, 328);
    
    // Set Year & Sport
    ctx.fillStyle = accentColor;
    ctx.font = '600 11px "Inter"';
    ctx.fillText(year + ' • ' + sport.toUpperCase(), 150, 348);
    
    // Grad details
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '500 10px "Inter"';
    ctx.fillText('VAULT 28 ORIGINAL SLAB MOCKUP', 150, 366);
    
    return canvas.toDataURL();
}

// Database Seeding function for Cloud Firestore
function seedCloudDatabase() {
    DEFAULT_COLLECTIONS.forEach(col => {
        col.cards = col.cards.map(card => {
            card.image = generateCardMockupImage(card.player, card.year, card.brand, col.sport);
            return card;
        });
        db.collection("collections").doc(col.id).set(col);
    });
}

// Database Sync and Initialization
function initDatabase() {
    if (isFirebaseActive) {
        // Setup Firebase Authentication listener
        firebase.auth().onAuthStateChanged((user) => {
            // Unsubscribe from previous collection listeners if active
            if (collectionsListener) {
                collectionsListener();
                collectionsListener = null;
            }

            if (user) {
                // Logged in UI Setup
                document.getElementById('auth-widget').style.display = 'none';
                document.getElementById('user-profile-widget').style.display = 'flex';
                document.getElementById('user-display-name').textContent = user.displayName || user.email.split('@')[0];
                
                // Role-based UI updates
                const roleLabel = document.getElementById('user-display-role');
                const roleSwitcher = document.getElementById('role-switcher-wrapper');
                
                if (user.email === 'lshaver.5128@gmail.com') {
                    roleLabel.textContent = "Vault 28 Owner";
                    roleLabel.style.color = "var(--accent-emerald)";
                    roleSwitcher.style.display = 'flex'; // Expose Valuation admin switcher
                } else {
                    roleLabel.textContent = "Seller Account";
                    roleLabel.style.color = "var(--accent-cyan)";
                    roleSwitcher.style.display = 'none'; // Lock out standard sellers
                    setRole('seller'); // Safeguard
                }

                // Query collections based on user credentials
                let query = db.collection("collections");
                if (user.email !== 'lshaver.5128@gmail.com') {
                    // Filter in Firestore by UID
                    query = query.where("sellerUid", "==", user.uid);
                }

                collectionsListener = query.onSnapshot((snapshot) => {
                    if (snapshot.empty && user.email === 'lshaver.5128@gmail.com') {
                        // Seed database if owner logs in and Firestore is empty
                        seedCloudDatabase();
                        return;
                    }

                    collections = [];
                    snapshot.forEach(doc => {
                        collections.push({ id: doc.id, ...doc.data() });
                    });
                    
                    // Sort collections by date locally to avoid requiring complex Firestore composite indexes
                    collections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    
                    triggerUIRefresh();
                }, (error) => {
                    console.error("Firestore sync error:", error);
                    showToast("Database access error. Verify permissions.", "error");
                });

            } else {
                // Logged Out UI state
                document.getElementById('auth-widget').style.display = 'flex';
                document.getElementById('user-profile-widget').style.display = 'none';
                document.getElementById('role-switcher-wrapper').style.display = 'none';
                
                collections = [];
                setRole('seller');
                switchView('seller-landing');
                triggerUIRefresh();
            }
        });
    } else {
        // Fallback to local storage (Sandbox Mode)
        const stored = localStorage.getItem('v28_collections');
        if (stored) {
            collections = JSON.parse(stored);
        } else {
            collections = DEFAULT_COLLECTIONS.map(col => {
                col.cards = col.cards.map(card => {
                    card.image = generateCardMockupImage(card.player, card.year, card.brand, col.sport);
                    return card;
                });
                return col;
            });
            saveDatabase();
        }
        
        // Expose switcher in Sandbox mode for local evaluation
        document.getElementById('auth-widget').style.display = 'none';
        document.getElementById('user-profile-widget').style.display = 'flex';
        document.getElementById('user-display-name').textContent = "Local Tester";
        document.getElementById('user-display-role').textContent = "Sandbox Mode";
        document.getElementById('role-switcher-wrapper').style.display = 'flex';
        triggerUIRefresh();
    }
}

function saveDatabase() {
    if (!isFirebaseActive) {
        localStorage.setItem('v28_collections', JSON.stringify(collections));
    }
}

// Helper to refresh the active UI panels when database updates occur
function triggerUIRefresh() {
    if (currentActiveRole === 'seller') {
        if (VIEWS['seller-dashboard'].classList.contains('active')) {
            renderSellerDashboard();
        } else if (selectedCollectionId && VIEWS['seller-detail'].classList.contains('active')) {
            renderSellerDetail(selectedCollectionId);
        }
    } else {
        if (VIEWS['buyer-dashboard'].classList.contains('active')) {
            renderBuyerDashboard();
        } else if (selectedCollectionId && VIEWS['buyer-detail'].classList.contains('active')) {
            renderBuyerDetail(selectedCollectionId);
        }
    }
}

// Navigation & Routing System
const VIEWS = {
    'seller-landing': document.getElementById('seller-landing'),
    'seller-submit': document.getElementById('seller-submit'),
    'seller-dashboard': document.getElementById('seller-dashboard'),
    'seller-detail': document.getElementById('seller-detail'),
    'buyer-dashboard': document.getElementById('buyer-dashboard'),
    'buyer-detail': document.getElementById('buyer-detail')
};

function switchView(viewId) {
    // Auth Guard check: prevent entering submit or dashboard views if logged out in Cloud Mode
    if (isFirebaseActive && !firebase.auth().currentUser) {
        if (viewId === 'seller-submit' || viewId === 'seller-dashboard' || viewId === 'seller-detail') {
            openAuthModal('login');
            showToast("Please log in or create an account to view and submit collections.", "error");
            return;
        }
    }

    Object.values(VIEWS).forEach(view => {
        if (view) view.classList.remove('active');
    });
    
    if (VIEWS[viewId]) {
        VIEWS[viewId].classList.add('active');
    }
    
    updateNavigationLinks(viewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavigationLinks(activeViewId) {
    const navContainer = document.getElementById('nav-links');
    navContainer.innerHTML = '';
    
    if (currentActiveRole === 'seller') {
        const links = [
            { label: 'Home', view: 'seller-landing' },
            { label: 'Submit Collection', view: 'seller-submit' },
            { label: 'My Collections', view: 'seller-dashboard' }
        ];
        
        links.forEach(link => {
            const el = document.createElement('a');
            el.className = `nav-link ${activeViewId === link.view ? 'active' : ''}`;
            el.textContent = link.label;
            el.addEventListener('click', (e) => {
                e.preventDefault();
                if (link.view !== 'seller-submit') {
                    resetSubmissionFormState();
                }
                switchView(link.view);
            });
            navContainer.appendChild(el);
        });
    } else {
        const links = [
            { label: 'Valuation Desk', view: 'buyer-dashboard' }
        ];
        
        links.forEach(link => {
            const el = document.createElement('a');
            el.className = `nav-link ${activeViewId === link.view ? 'active' : ''}`;
            el.textContent = link.label;
            el.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(link.view);
            });
            navContainer.appendChild(el);
        });
    }
}

// Role Switcher Management
function setRole(role) {
    currentActiveRole = role;
    
    const btnSeller = document.getElementById('btn-role-seller');
    const btnBuyer = document.getElementById('btn-role-buyer');
    
    if (role === 'seller') {
        btnSeller.classList.add('active');
        btnBuyer.classList.remove('active');
        document.getElementById('buyer-update-dot').style.display = 'none';
        
        if (selectedCollectionId && VIEWS['seller-detail'].classList.contains('active')) {
            renderSellerDetail(selectedCollectionId);
        } else {
            switchView('seller-landing');
        }
    } else {
        // Owner Guard check
        if (isFirebaseActive) {
            const user = firebase.auth().currentUser;
            if (!user || user.email !== 'lshaver.5128@gmail.com') {
                showToast("Access Denied: Owner account permissions required.", "error");
                setRole('seller');
                return;
            }
        }

        btnBuyer.classList.add('active');
        btnSeller.classList.remove('active');
        
        renderBuyerDashboard();
        
        if (selectedCollectionId && VIEWS['buyer-detail'].classList.contains('active')) {
            renderBuyerDetail(selectedCollectionId);
        } else {
            switchView('buyer-dashboard');
        }
    }
}

// Toast Notification Manager
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'success' : ''}`;
    
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}


// ==================== AUTHENTICATION ACTIONS ====================

// Open Auth Modal
function openAuthModal(mode = 'login') {
    authModalMode = mode;
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'flex';
    
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const nameGroup = document.getElementById('auth-name-group');
    const btnSubmit = document.getElementById('btn-auth-submit');
    
    document.getElementById('auth-form').reset();
    
    if (mode === 'login') {
        tabLogin.style.color = 'var(--text-primary)';
        tabLogin.style.borderBottom = '2px solid var(--accent-cyan)';
        tabSignup.style.color = 'var(--text-secondary)';
        tabSignup.style.borderBottom = 'none';
        nameGroup.style.display = 'none';
        btnSubmit.textContent = 'Log In';
    } else {
        tabSignup.style.color = 'var(--text-primary)';
        tabSignup.style.borderBottom = '2px solid var(--accent-cyan)';
        tabLogin.style.color = 'var(--text-secondary)';
        tabLogin.style.borderBottom = 'none';
        nameGroup.style.display = 'block';
        btnSubmit.textContent = 'Create Account';
    }
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

// Auth Tabs click bindings
document.getElementById('tab-login').addEventListener('click', () => openAuthModal('login'));
document.getElementById('tab-signup').addEventListener('click', () => openAuthModal('signup'));
document.getElementById('btn-close-auth-modal').addEventListener('click', closeAuthModal);

// Header Auth button bindings
document.getElementById('btn-header-signin').addEventListener('click', () => openAuthModal('login'));
document.getElementById('btn-header-signup').addEventListener('click', () => openAuthModal('signup'));
document.getElementById('btn-header-signout').addEventListener('click', () => {
    if (isFirebaseActive) {
        firebase.auth().signOut().then(() => {
            showToast("Successfully signed out.");
        });
    }
});

// Auth form submit
document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isFirebaseActive) return;
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim();
    
    const btnSubmit = document.getElementById('btn-auth-submit');
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Processing...";
    
    if (authModalMode === 'login') {
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(() => {
                closeAuthModal();
                showToast("Welcome back!", "success");
            })
            .catch(err => {
                console.error("Login failed:", err);
                showToast(err.message || "Login failed.", "error");
            })
            .finally(() => {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Log In";
            });
    } else {
        if (!name) {
            showToast("Please enter your name", "error");
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Create Account";
            return;
        }
        
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((credential) => {
                // Update User Display Name Profile
                credential.user.updateProfile({
                    displayName: name
                }).then(() => {
                    closeAuthModal();
                    showToast(`Account created, welcome ${name}!`, "success");
                    // Force profile display refresh
                    initDatabase();
                });
            })
            .catch(err => {
                console.error("Signup failed:", err);
                showToast(err.message || "Account creation failed.", "error");
            })
            .finally(() => {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Create Account";
            });
    }
});


// ==================== SELLER logic ====================

// Dropzone Image upload
const dropzone = document.getElementById('card-dropzone');
const fileInput = document.getElementById('card-file-input');
const previewContainer = document.getElementById('card-images-preview');

dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent-cyan)';
    dropzone.style.background = 'rgba(6, 182, 212, 0.05)';
});

dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.background = 'rgba(255, 255, 255, 0.01)';
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.background = 'rgba(255, 255, 255, 0.01)';
    
    if (e.dataTransfer.files.length > 0) {
        handleImageFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImageFile(e.target.files[0]);
    }
});

function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Only image files are supported', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedCardImageBase64 = e.target.result;
        previewContainer.innerHTML = `
            <div class="uploaded-preview-item">
                <img src="${uploadedCardImageBase64}">
                <button type="button" class="uploaded-preview-remove" id="btn-remove-uploaded">×</button>
            </div>
        `;
        document.getElementById('btn-remove-uploaded').addEventListener('click', (e) => {
            e.stopPropagation();
            removeUploadedImage();
        });
    };
    reader.readAsDataURL(file);
}

function removeUploadedImage() {
    uploadedCardImageBase64 = null;
    previewContainer.innerHTML = '';
    fileInput.value = '';
}

// Add Card to Temp Inventory List
document.getElementById('btn-add-card-to-list').addEventListener('click', () => {
    const player = document.getElementById('card-player').value.trim();
    const brand = document.getElementById('card-brand').value.trim();
    const year = document.getElementById('card-year').value;
    const grade = document.getElementById('card-grade').value;
    const sport = document.getElementById('collection-sport').value;
    
    if (!player || !brand || !year) {
        showToast('Please enter Player Name, Brand/Set, and Card Year', 'error');
        return;
    }
    
    const cardImage = uploadedCardImageBase64 || generateCardMockupImage(player, year, brand, sport);
    
    const cardObj = {
        player,
        brand,
        year: parseInt(year),
        grade,
        image: cardImage
    };
    
    tempCards.push(cardObj);
    renderTempCardsList();
    
    document.getElementById('card-player').value = '';
    document.getElementById('card-brand').value = '';
    document.getElementById('card-year').value = '';
    removeUploadedImage();
    
    showToast(`Added ${player} to list!`);
});

function renderTempCardsList() {
    const container = document.getElementById('temp-cards-list');
    const badge = document.getElementById('cards-count-badge');
    
    badge.textContent = tempCards.length;
    
    if (tempCards.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 8px;">
                No cards added yet. Add at least one card detail above.
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    tempCards.forEach((card, idx) => {
        const row = document.createElement('div');
        row.className = 'card-item-row';
        row.innerHTML = `
            <img class="card-item-img" src="${card.image}" alt="Card image">
            <div class="card-item-details">
                <div class="card-item-name">${card.player}</div>
                <div class="card-item-meta">${card.year} ${card.brand} • <span style="color: var(--accent-cyan); font-weight: 500;">${card.grade}</span></div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" style="color: var(--accent-red); border-color: rgba(239,68,68,0.2); padding: 0.25rem 0.5rem;" onclick="removeTempCard(${idx})">
                Remove
            </button>
        `;
        container.appendChild(row);
    });
}

window.removeTempCard = function(index) {
    tempCards.splice(index, 1);
    renderTempCardsList();
};

function resetSubmissionFormState() {
    document.getElementById('submission-form').reset();
    tempCards = [];
    removeUploadedImage();
    renderTempCardsList();
    document.getElementById('step-2').classList.remove('active');
    document.getElementById('step-1').classList.add('active');
}

// Submission Form Submit
document.getElementById('submission-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (isFirebaseActive && !firebase.auth().currentUser) {
        openAuthModal('login');
        showToast("Please sign in or create an account to submit your card collection.", "error");
        return;
    }

    const name = document.getElementById('collection-name').value.trim();
    const desc = document.getElementById('collection-desc').value.trim();
    const sport = document.getElementById('collection-sport').value;
    const asking = parseFloat(document.getElementById('collection-asking').value);
    
    if (tempCards.length === 0) {
        showToast('You must add at least one card to your collection submission', 'error');
        return;
    }
    
    const user = isFirebaseActive ? firebase.auth().currentUser : null;
    
    const newCollection = {
        id: 'col-' + Math.random().toString(36).substr(2, 9),
        title: name,
        description: desc,
        sport,
        sellerName: user ? (user.displayName || user.email.split('@')[0]) : 'Luke S.',
        sellerEmail: user ? user.email : 'luke.s@gmail.com',
        sellerUid: user ? user.uid : 'sandbox-luke-uid',
        askingPrice: asking,
        offerPrice: 0,
        status: 'Pending Review',
        createdAt: new Date().toISOString(),
        cards: [...tempCards],
        messages: [
            {
                sender: 'system',
                senderName: 'System',
                text: 'Collection submitted for valuation review.',
                timestamp: new Date().toISOString()
            }
        ]
    };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(newCollection.id).set(newCollection)
            .then(() => {
                showToast('Collection submitted to cloud successfully!', 'success');
                resetSubmissionFormState();
                switchView('seller-dashboard');
            })
            .catch(err => {
                console.error("Firestore submission failed:", err);
                showToast('Error uploading. Check Firebase configuration.', 'error');
            });
    } else {
        collections.push(newCollection);
        saveDatabase();
        resetSubmissionFormState();
        showToast('Collection saved to local sandbox!', 'success');
        renderSellerDashboard();
        switchView('seller-dashboard');
    }
});

// Render Seller Dashboard
function renderSellerDashboard() {
    const listContainer = document.getElementById('seller-collections-list');
    listContainer.innerHTML = '';
    
    if (collections.length === 0) {
        listContainer.innerHTML = `
            <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-secondary);">
                <p style="font-size: 1.2rem; margin-bottom: 1.5rem;">You haven't submitted any card collections yet.</p>
                <button class="btn btn-primary" onclick="switchView('seller-submit')">Submit First Collection</button>
            </div>
        `;
        return;
    }
    
    collections.forEach(col => {
        const card = document.createElement('div');
        card.className = 'glass-card collection-card';
        card.addEventListener('click', () => {
            renderSellerDetail(col.id);
        });
        
        let badgeClass = 'badge-pending';
        if (col.status === 'Negotiating') badgeClass = 'badge-negotiating';
        if (col.status === 'Offer Made') badgeClass = 'badge-offer';
        if (col.status === 'Bought') badgeClass = 'badge-bought';
        if (col.status === 'Declined') badgeClass = 'badge-declined';
        
        let previewHtml = '';
        col.cards.slice(0, 4).forEach(c => {
            previewHtml += `<img class="collection-preview-thumb" src="${c.image}">`;
        });
        if (col.cards.length > 4) {
            previewHtml += `<div class="collection-preview-placeholder">+${col.cards.length - 4}</div>`;
        }
        
        let pricingFooter = '';
        if (col.status === 'Offer Made') {
            pricingFooter = `
                <div class="collection-price-box">
                    <span class="price-label">Our Offer</span>
                    <span class="price-val offer">$${col.offerPrice.toLocaleString()}</span>
                </div>
            `;
        } else if (col.status === 'Bought') {
            pricingFooter = `
                <div class="collection-price-box">
                    <span class="price-label">Purchased For</span>
                    <span class="price-val bought">$${col.offerPrice.toLocaleString()}</span>
                </div>
            `;
        } else {
            pricingFooter = `
                <div class="collection-price-box">
                    <span class="price-label">Asking Price</span>
                    <span class="price-val">$${col.askingPrice.toLocaleString()}</span>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div>
                <div class="collection-card-header">
                    <span class="badge ${badgeClass}">${col.status}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(col.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 class="collection-title">${col.title}</h3>
                <div class="collection-meta">
                    <span>🏀 ${col.sport}</span>
                    <span>🃏 ${col.cards.length} Cards</span>
                </div>
                <div class="collection-preview-row">
                    ${previewHtml}
                </div>
            </div>
            <div class="collection-card-footer">
                ${pricingFooter}
                <span style="font-size: 0.85rem; color: var(--accent-cyan); font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                    View & Negotiate 
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// Render Seller Detail View
function renderSellerDetail(id) {
    selectedCollectionId = id;
    const col = collections.find(c => c.id === id);
    if (!col) return;
    
    switchView('seller-detail');
    
    document.getElementById('seller-detail-title').textContent = col.title;
    document.getElementById('seller-detail-desc').textContent = col.description;
    document.getElementById('seller-detail-sport').textContent = col.sport;
    document.getElementById('seller-detail-card-count').textContent = col.cards.length;
    
    const badge = document.getElementById('seller-detail-status');
    badge.textContent = col.status;
    badge.className = 'badge';
    if (col.status === 'Pending Review') badge.classList.add('badge-pending');
    if (col.status === 'Negotiating') badge.classList.add('badge-negotiating');
    if (col.status === 'Offer Made') badge.classList.add('badge-offer');
    if (col.status === 'Bought') badge.classList.add('badge-bought');
    if (col.status === 'Declined') badge.classList.add('badge-declined');
    
    const headerPrice = document.getElementById('seller-chat-header-price');
    if (col.status === 'Offer Made' || col.status === 'Bought') {
        headerPrice.textContent = `$${col.offerPrice.toLocaleString()}`;
        headerPrice.className = 'price-val offer';
        if (col.status === 'Bought') headerPrice.className = 'price-val bought';
    } else {
        headerPrice.textContent = `$${col.askingPrice.toLocaleString()}`;
        headerPrice.className = 'price-val';
    }
    
    const statusBox = document.getElementById('seller-status-alert-box');
    const chatActionBox = document.getElementById('seller-chat-action-box');
    statusBox.innerHTML = '';
    chatActionBox.innerHTML = '';
    chatActionBox.style.display = 'none';
    
    if (col.status === 'Offer Made') {
        statusBox.innerHTML = `
            <div class="glass-card" style="padding: 0.75rem 1.25rem; border-color: var(--accent-orange); background: rgba(249, 115, 22, 0.05); display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                <div style="font-size: 0.9rem;">
                    🔥 <strong style="color: var(--accent-orange);">Offer Received:</strong> Vault 28 offered <strong>$${col.offerPrice.toLocaleString()}</strong> for this collection.
                </div>
            </div>
        `;
        
        chatActionBox.style.display = 'block';
        chatActionBox.innerHTML = `
            <div class="chat-offer-card">
                <div class="chat-offer-header">
                    <span>Valuation Counter Offer</span>
                    <span class="badge badge-offer">Active</span>
                </div>
                <div class="chat-offer-val">$${col.offerPrice.toLocaleString()}</div>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Accepting seals the deal. We will contact you immediately to coordinate shipping and payments.</p>
                <div class="chat-offer-actions">
                    <button class="btn btn-success btn-sm" style="flex: 1;" onclick="sellerAcceptOffer('${col.id}')">Accept Offer</button>
                    <button class="btn btn-secondary btn-sm" style="flex: 1; color: var(--accent-red);" onclick="sellerDeclineOffer('${col.id}')">Decline / Counter</button>
                </div>
            </div>
        `;
    } else if (col.status === 'Bought') {
        statusBox.innerHTML = `
            <div class="glass-card" style="padding: 0.75rem 1.25rem; border-color: var(--accent-emerald); background: rgba(13, 243, 163, 0.05); font-size: 0.9rem;">
                🎉 <strong>Deal Closed!</strong> Vault 28 bought this collection for <strong>$${col.offerPrice.toLocaleString()}</strong>. Check messages below for shipping address instructions.
            </div>
        `;
    } else if (col.status === 'Declined') {
        statusBox.innerHTML = `
            <div class="glass-card" style="padding: 0.75rem 1.25rem; border-color: var(--accent-red); background: rgba(239, 68, 68, 0.05); font-size: 0.9rem; color: var(--text-secondary);">
                🔒 This collection submission has been declined by the buying desk.
            </div>
        `;
    }
    
    // Render Slabs
    const slabContainer = document.getElementById('seller-detail-slab-visuals');
    slabContainer.innerHTML = '';
    
    col.cards.forEach(card => {
        let gradeNum = '9';
        let gradeText = 'MINT';
        
        if (card.grade.includes('10')) {
            gradeNum = '10';
            gradeText = 'GEM MT';
        } else if (card.grade.includes('9.5')) {
            gradeNum = '9.5';
            gradeText = 'GEM MT';
        } else if (card.grade.includes('8')) {
            gradeNum = '8';
            gradeText = 'NM-MT';
        } else if (card.grade.toLowerCase().includes('excellent')) {
            gradeNum = '6';
            gradeText = 'EX';
        } else if (card.grade.toLowerCase().includes('played') || card.grade.toLowerCase().includes('good')) {
            gradeNum = '4';
            gradeText = 'VG';
        }
        
        const slab = document.createElement('div');
        slab.className = 'card-slab';
        slab.innerHTML = `
            <div class="slab-label">
                <div class="slab-label-brand">VAULT 28 GRADING</div>
                <div class="slab-label-info">
                    <span class="card-player">${card.player}</span>
                    <span>${card.year} ${card.brand.split('#')[0].trim()}</span>
                </div>
                <div class="slab-label-grade-box">
                    <div class="slab-label-grade-num">${gradeNum}</div>
                    <div class="slab-label-grade-text">${gradeText}</div>
                </div>
            </div>
            <div class="slab-image-container">
                <img class="slab-image" src="${card.image}">
            </div>
            <div class="slab-footer">${card.player} - #${card.brand.split('#')[1] || 'Rookie'}</div>
        `;
        slabContainer.appendChild(slab);
    });
    
    // Inventory List
    const invContainer = document.getElementById('seller-detail-cards-list');
    invContainer.innerHTML = '';
    col.cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'card-item-row';
        item.innerHTML = `
            <img class="card-item-img" src="${card.image}" alt="">
            <div class="card-item-details">
                <div class="card-item-name">${card.player}</div>
                <div class="card-item-meta">${card.year} ${card.brand}</div>
            </div>
            <div class="card-item-price">${card.grade}</div>
        `;
        invContainer.appendChild(item);
    });
    
    renderChatMessages('seller-chat-messages', col.messages, 'seller');
}

// Chat Suggestions Chips
document.getElementById('seller-chat-suggestions').addEventListener('click', (e) => {
    if (e.target.classList.contains('chat-suggestion-chip')) {
        document.getElementById('seller-chat-input').value = e.target.textContent;
        document.getElementById('seller-chat-input').focus();
    }
});

// Seller Chat Submit
document.getElementById('seller-chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('seller-chat-input');
    const text = input.value.trim();
    if (!text || !selectedCollectionId) return;
    
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const user = isFirebaseActive ? firebase.auth().currentUser : null;
    const sellerName = user ? (user.displayName || user.email.split('@')[0]) : col.sellerName;
    
    const newMsg = {
        sender: 'seller',
        senderName: sellerName,
        text: text,
        timestamp: new Date().toISOString()
    };
    
    const nextStatus = col.status === 'Pending Review' ? 'Negotiating' : col.status;
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: nextStatus,
            messages: firebase.firestore.FieldValue.arrayUnion(newMsg)
        }).then(() => {
            input.value = '';
        }).catch(err => {
            console.error("Cloud chat failed:", err);
            showToast("Failed to sync message.", "error");
        });
    } else {
        col.messages.push(newMsg);
        col.status = nextStatus;
        saveDatabase();
        input.value = '';
        renderSellerDetail(col.id);
        notifyBuyerOfMessage(col.title);
    }
});

function notifyBuyerOfMessage(colTitle) {
    if (currentActiveRole === 'seller') {
        document.getElementById('buyer-update-dot').style.display = 'block';
        showToast(`Buyer Desk: New message received on "${colTitle}"`);
    }
}

// Seller Accept Offer
window.sellerAcceptOffer = function(id) {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    
    const systemMsg = {
        sender: 'system',
        senderName: 'System',
        text: 'Offer accepted! The transaction is locked. Vault 28 will process payment.',
        timestamp: new Date().toISOString()
    };
    
    const buyerMsg = {
        sender: 'buyer',
        senderName: 'V28 Buying Desk',
        text: `Congratulations on the sale! We have registered this purchase of $${col.offerPrice.toLocaleString()}. Please pack the cards securely in bubble wrap and top loaders, and ship them to: Vault 28 Headquarters, 100 Collector Way, Suite A, New York, NY 10001. Please reply with the tracking number!`,
        timestamp: new Date().toISOString()
    };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(id).update({
            status: 'Bought',
            messages: firebase.firestore.FieldValue.arrayUnion(systemMsg, buyerMsg)
        }).then(() => {
            showToast('Offer accepted! Deal closed!', 'success');
        }).catch(err => {
            showToast('Accept failed.', 'error');
        });
    } else {
        col.status = 'Bought';
        col.messages.push(systemMsg, buyerMsg);
        saveDatabase();
        showToast('Offer accepted! Deal closed!', 'success');
        renderSellerDetail(col.id);
    }
};

// Seller Decline Offer
window.sellerDeclineOffer = function(id) {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    
    const systemMsg = {
        sender: 'system',
        senderName: 'System',
        text: 'Seller declined the offer and opened negotiations.',
        timestamp: new Date().toISOString()
    };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(id).update({
            status: 'Negotiating',
            messages: firebase.firestore.FieldValue.arrayUnion(systemMsg)
        }).then(() => {
            showToast('Offer declined. Chat is open.');
        }).catch(err => {
            showToast('Decline failed.', 'error');
        });
    } else {
        col.status = 'Negotiating';
        col.messages.push(systemMsg);
        saveDatabase();
        showToast('Offer declined. You can message the buying desk directly to explain your counter price.');
        renderSellerDetail(col.id);
    }
};


// ==================== BUYER (OWNER) DESK logic ====================

// Render Buyer Dashboard Overview
function renderBuyerDashboard() {
    const tableBody = document.getElementById('buyer-submissions-list-rows');
    tableBody.innerHTML = '';
    
    const totalSub = collections.length;
    const pendingVal = collections.filter(c => c.status === 'Pending Review').length;
    const activeNeg = collections.filter(c => c.status === 'Offer Made' || c.status === 'Negotiating').length;
    const dealsClosed = collections.filter(c => c.status === 'Bought').length;
    
    document.getElementById('stat-total-submissions').textContent = totalSub;
    document.getElementById('stat-pending-valuations').textContent = pendingVal;
    document.getElementById('stat-active-negotiations').textContent = activeNeg;
    document.getElementById('stat-deals-closed').textContent = dealsClosed;
    
    if (collections.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No submissions received yet.
                </td>
            </tr>
        `;
        return;
    }
    
    const sorted = [...collections].sort((a,b) => {
        if (a.status === 'Pending Review' && b.status !== 'Pending Review') return -1;
        if (a.status !== 'Pending Review' && b.status === 'Pending Review') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    sorted.forEach(col => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-color)';
        row.style.fontSize = '0.92rem';
        row.className = 'table-row-hover';
        
        let badgeClass = 'badge-pending';
        if (col.status === 'Negotiating') badgeClass = 'badge-negotiating';
        if (col.status === 'Offer Made') badgeClass = 'badge-offer';
        if (col.status === 'Bought') badgeClass = 'badge-bought';
        if (col.status === 'Declined') badgeClass = 'badge-declined';
        
        const offerVal = col.offerPrice > 0 ? `$${col.offerPrice.toLocaleString()}` : '—';
        
        row.innerHTML = `
            <td style="padding: 1.2rem 0.5rem; font-weight: 600; color: var(--text-primary);">${col.title}</td>
            <td style="padding: 1.2rem 0.5rem; color: var(--text-secondary);">${col.sellerName}</td>
            <td style="padding: 1.2rem 0.5rem; color: var(--text-secondary);">🏀 ${col.sport}</td>
            <td style="padding: 1.2rem 0.5rem; color: var(--text-secondary);">${col.cards.length}</td>
            <td style="padding: 1.2rem 0.5rem; font-weight: 600; color: var(--text-secondary);">$${col.askingPrice.toLocaleString()}</td>
            <td style="padding: 1.2rem 0.5rem; font-weight: 700; color: ${col.status === 'Bought' ? 'var(--accent-emerald)' : 'var(--accent-orange)'};">${offerVal}</td>
            <td style="padding: 1.2rem 0.5rem;"><span class="badge ${badgeClass}">${col.status}</span></td>
            <td style="padding: 1.2rem 0.5rem; text-align: right;">
                <button class="btn btn-outline-cyan btn-sm" onclick="renderBuyerDetail('${col.id}')">
                    Inspect & Value
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Render Buyer/Review Detail Page
function renderBuyerDetail(id) {
    selectedCollectionId = id;
    const col = collections.find(c => c.id === id);
    if (!col) return;
    
    switchView('buyer-detail');
    
    document.getElementById('buyer-detail-title').textContent = col.title;
    document.getElementById('buyer-detail-desc').textContent = col.description;
    document.getElementById('buyer-detail-sport').textContent = col.sport;
    document.getElementById('buyer-detail-seller-name').textContent = col.sellerName;
    document.getElementById('buyer-detail-card-count').textContent = col.cards.length;
    
    const badge = document.getElementById('buyer-detail-status');
    badge.textContent = col.status;
    badge.className = 'badge';
    if (col.status === 'Pending Review') badge.classList.add('badge-pending');
    if (col.status === 'Negotiating') badge.classList.add('badge-negotiating');
    if (col.status === 'Offer Made') badge.classList.add('badge-offer');
    if (col.status === 'Bought') badge.classList.add('badge-bought');
    if (col.status === 'Declined') badge.classList.add('badge-declined');
    
    document.getElementById('buyer-val-asking').value = col.askingPrice;
    document.getElementById('buyer-val-offer').value = col.offerPrice > 0 ? col.offerPrice : Math.floor(col.askingPrice * 0.85);
    document.getElementById('buyer-offer-note').value = '';
    
    const headerPrice = document.getElementById('buyer-chat-header-price');
    headerPrice.textContent = `$${col.askingPrice.toLocaleString()}`;
    
    const chatAvatar = document.getElementById('buyer-chat-avatar');
    chatAvatar.textContent = col.sellerName.charAt(0);
    document.getElementById('buyer-chat-seller-title').textContent = col.sellerName;
    
    const statusBox = document.getElementById('buyer-status-alert-box');
    statusBox.innerHTML = '';
    if (col.status === 'Offer Made') {
        statusBox.innerHTML = `
            <div class="glass-card" style="padding: 0.75rem 1.25rem; border-color: var(--accent-orange); background: rgba(249, 115, 22, 0.05); font-size: 0.9rem;">
                ⏳ <strong>Offer Sent:</strong> An active offer of <strong>$${col.offerPrice.toLocaleString()}</strong> has been delivered to the seller. Awaiting decision.
            </div>
        `;
    } else if (col.status === 'Bought') {
        statusBox.innerHTML = `
            <div class="glass-card" style="padding: 0.75rem 1.25rem; border-color: var(--accent-emerald); background: rgba(13, 243, 163, 0.05); font-size: 0.9rem;">
                🎉 <strong>Deal Closed!</strong> You purchased this collection for <strong>$${col.offerPrice.toLocaleString()}</strong>.
            </div>
        `;
    } else if (col.status === 'Declined') {
        statusBox.innerHTML = `
            <div class="glass-card" style="padding: 0.75rem 1.25rem; border-color: var(--accent-red); background: rgba(239, 68, 68, 0.05); font-size: 0.9rem; color: var(--text-secondary);">
                🚫 This submission has been declined.
            </div>
        `;
    }
    
    // Render Slabs
    const slabContainer = document.getElementById('buyer-detail-slab-visuals');
    slabContainer.innerHTML = '';
    
    col.cards.forEach(card => {
        let gradeNum = '9';
        let gradeText = 'MINT';
        if (card.grade.includes('10')) {
            gradeNum = '10';
            gradeText = 'GEM MT';
        } else if (card.grade.includes('9.5')) {
            gradeNum = '9.5';
            gradeText = 'GEM MT';
        } else if (card.grade.includes('8')) {
            gradeNum = '8';
            gradeText = 'NM-MT';
        } else if (card.grade.toLowerCase().includes('excellent')) {
            gradeNum = '6';
            gradeText = 'EX';
        } else if (card.grade.toLowerCase().includes('played') || card.grade.toLowerCase().includes('good')) {
            gradeNum = '4';
            gradeText = 'VG';
        }
        
        const slab = document.createElement('div');
        slab.className = 'card-slab';
        slab.innerHTML = `
            <div class="slab-label">
                <div class="slab-label-brand">VAULT 28 GRADING</div>
                <div class="slab-label-info">
                    <span class="card-player">${card.player}</span>
                    <span>${card.year} ${card.brand.split('#')[0].trim()}</span>
                </div>
                <div class="slab-label-grade-box">
                    <div class="slab-label-grade-num">${gradeNum}</div>
                    <div class="slab-label-grade-text">${gradeText}</div>
                </div>
            </div>
            <div class="slab-image-container">
                <img class="slab-image" src="${card.image}">
            </div>
            <div class="slab-footer">${card.player} - #${card.brand.split('#')[1] || 'Rookie'}</div>
        `;
        slabContainer.appendChild(slab);
    });
    
    // Inventory List
    const invContainer = document.getElementById('buyer-detail-cards-list');
    invContainer.innerHTML = '';
    col.cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'card-item-row';
        item.innerHTML = `
            <img class="card-item-img" src="${card.image}" alt="">
            <div class="card-item-details">
                <div class="card-item-name">${card.player}</div>
                <div class="card-item-meta">${card.year} ${card.brand}</div>
            </div>
            <div class="card-item-price">${card.grade}</div>
        `;
        invContainer.appendChild(item);
    });
    
    renderChatMessages('buyer-chat-messages', col.messages, 'buyer');
}

// Buyer Suggestions Chips
document.getElementById('buyer-chat-suggestions').addEventListener('click', (e) => {
    if (e.target.classList.contains('chat-suggestion-chip')) {
        document.getElementById('buyer-chat-input').value = e.target.textContent;
        document.getElementById('buyer-chat-input').focus();
    }
});

// Buyer Chat Submit
document.getElementById('buyer-chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('buyer-chat-input');
    const text = input.value.trim();
    if (!text || !selectedCollectionId) return;
    
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const newMsg = {
        sender: 'buyer',
        senderName: 'V28 Buying Desk',
        text: text,
        timestamp: new Date().toISOString()
    };
    
    const nextStatus = col.status === 'Pending Review' ? 'Negotiating' : col.status;
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: nextStatus,
            messages: firebase.firestore.FieldValue.arrayUnion(newMsg)
        }).then(() => {
            input.value = '';
        }).catch(err => {
            console.error("Cloud chat failed:", err);
            showToast("Failed to sync message.", "error");
        });
    } else {
        col.messages.push(newMsg);
        col.status = nextStatus;
        saveDatabase();
        input.value = '';
        renderBuyerDetail(col.id);
        notifySellerOfMessage(col.title);
    }
});

function notifySellerOfMessage(colTitle) {
    if (currentActiveRole === 'seller') {
        showToast(`Buying Desk: New message received on "${colTitle}"`);
        if (selectedCollectionId) {
            renderSellerDetail(selectedCollectionId);
        }
    }
}

// Buyer Action: Send Counter Offer
document.getElementById('btn-buyer-send-offer').addEventListener('click', () => {
    const offerInput = document.getElementById('buyer-val-offer');
    const offerVal = parseFloat(offerInput.value);
    const note = document.getElementById('buyer-offer-note').value.trim();
    
    if (!offerVal || !selectedCollectionId) {
        showToast('Please enter a valid counter offer price', 'error');
        return;
    }
    
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const systemMsg = {
        sender: 'system',
        senderName: 'System',
        text: `Vault 28 Buying Desk made a counter offer of $${offerVal.toLocaleString()}.`,
        timestamp: new Date().toISOString()
    };
    
    const customMsg = {
        sender: 'buyer',
        senderName: 'V28 Buying Desk',
        text: note ? `Offer details: ${note}` : `We have reviewed your collection and can make a counter offer of $${offerVal.toLocaleString()}. Let us know if you accept!`,
        timestamp: new Date().toISOString()
    };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: 'Offer Made',
            offerPrice: offerVal,
            messages: firebase.firestore.FieldValue.arrayUnion(systemMsg, customMsg)
        }).then(() => {
            showToast('Counter offer sent!', 'success');
        }).catch(err => {
            showToast('Counter offer failed.', 'error');
        });
    } else {
        col.status = 'Offer Made';
        col.offerPrice = offerVal;
        col.messages.push(systemMsg, customMsg);
        saveDatabase();
        showToast('Counter offer sent to seller!', 'success');
        renderBuyerDetail(col.id);
    }
});

// Buyer Action: Buy at Asking
document.getElementById('btn-buyer-buy-asking').addEventListener('click', () => {
    if (!selectedCollectionId) return;
    
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const systemMsg = {
        sender: 'system',
        senderName: 'System',
        text: `Vault 28 accepted the asking price and purchased the collection for $${col.askingPrice.toLocaleString()}!`,
        timestamp: new Date().toISOString()
    };
    
    const buyerMsg = {
        sender: 'buyer',
        senderName: 'V28 Buying Desk',
        text: `We have accepted your asking price of $${col.askingPrice.toLocaleString()}! The deal is closed. Please ship the cards to our headquarters (Vault 28 Headquarters, 100 Collector Way, Suite A, New York, NY 10001) and let us know the tracking number here. Payment will be processed immediately upon receipt and inspection of the package.`,
        timestamp: new Date().toISOString()
    };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: 'Bought',
            offerPrice: col.askingPrice,
            messages: firebase.firestore.FieldValue.arrayUnion(systemMsg, buyerMsg)
        }).then(() => {
            showToast('Collection bought at asking!', 'success');
        }).catch(err => {
            showToast('Purchase failed.', 'error');
        });
    } else {
        col.status = 'Bought';
        col.offerPrice = col.askingPrice;
        col.messages.push(systemMsg, buyerMsg);
        saveDatabase();
        showToast('Collection bought at asking price!', 'success');
        renderBuyerDetail(col.id);
    }
});

// Buyer Action: Decline
document.getElementById('btn-buyer-decline').addEventListener('click', () => {
    if (!selectedCollectionId) return;
    
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const systemMsg = {
        sender: 'system',
        senderName: 'System',
        text: 'This submission has been declined by Vault 28.',
        timestamp: new Date().toISOString()
    };
    
    const buyerMsg = {
        sender: 'buyer',
        senderName: 'V28 Buying Desk',
        text: 'Thank you for submitting your collection. Unfortunately, we are not purchasing these specific cards at this time. Good luck with your sales!',
        timestamp: new Date().toISOString()
    };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: 'Declined',
            messages: firebase.firestore.FieldValue.arrayUnion(systemMsg, buyerMsg)
        }).then(() => {
            showToast('Submission declined.');
        }).catch(err => {
            showToast('Decline failed.', 'error');
        });
    } else {
        col.status = 'Declined';
        col.messages.push(systemMsg, buyerMsg);
        saveDatabase();
        showToast('Submission declined.');
        renderBuyerDetail(col.id);
    }
});


// ==================== GLOBAL CONTROLS & BINDINGS ====================

// Brand Logo Home Redirect
document.getElementById('brand-logo').addEventListener('click', (e) => {
    e.preventDefault();
    resetSubmissionFormState();
    if (currentActiveRole === 'seller') {
        switchView('seller-landing');
    } else {
        switchView('buyer-dashboard');
    }
});

document.getElementById('btn-hero-sell').addEventListener('click', () => {
    switchView('seller-submit');
});

document.getElementById('btn-hero-browse').addEventListener('click', () => {
    switchView('seller-dashboard');
});

document.getElementById('btn-cancel-submit').addEventListener('click', () => {
    resetSubmissionFormState();
    switchView('seller-landing');
});

document.getElementById('btn-seller-back-dashboard').addEventListener('click', () => {
    switchView('seller-dashboard');
});

document.getElementById('btn-buyer-back-dashboard').addEventListener('click', () => {
    renderBuyerDashboard();
    switchView('buyer-dashboard');
});

document.getElementById('btn-dashboard-new').addEventListener('click', () => {
    switchView('seller-submit');
});

// Role switcher bindings
document.getElementById('btn-role-seller').addEventListener('click', () => setRole('seller'));
document.getElementById('btn-role-buyer').addEventListener('click', () => setRole('buyer'));

// Page Init
document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('sandbox-banner');
    if (isFirebaseActive) {
        if (banner) banner.style.display = 'none';
    } else {
        if (banner) banner.style.display = 'flex';
        
        document.getElementById('btn-setup-db').addEventListener('click', () => {
            document.getElementById('db-setup-modal').style.display = 'flex';
        });
        document.getElementById('btn-close-db-modal').addEventListener('click', () => {
            document.getElementById('db-setup-modal').style.display = 'none';
        });
        document.getElementById('btn-close-db-modal-ok').addEventListener('click', () => {
            document.getElementById('db-setup-modal').style.display = 'none';
        });
    }

    initDatabase();
    setRole('seller');
});

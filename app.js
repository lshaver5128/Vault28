// Vault 28 Trading Co. - Application Logic Engine

// --- FIREBASE CONFIGURATION ---
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

// Routing maps
const ROUTE_MAP = {
    'seller-landing': '/',
    'seller-submit': '/sell',
    'seller-dashboard': '/my-collections',
    'seller-detail': '/collection',
    'shop': '/shop',
    'about': '/about',
    'contact': '/contact',
    'customer-thread': '/contact-thread',
    'buyer-dashboard': '/admin',
    'buyer-detail': '/admin/review'
};

const PATH_MAP = {
    '/': 'seller-landing',
    '/sell': 'seller-submit',
    '/my-collections': 'seller-dashboard',
    '/collection': 'seller-detail',
    '/shop': 'shop',
    '/about': 'about',
    '/contact': 'contact',
    '/contact-thread': 'customer-thread',
    '/admin': 'buyer-dashboard',
    '/admin/review': 'buyer-detail'
};

if (isFirebaseActive) {
    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
    } catch (err) {
        console.error("Firebase Initialization Error:", err);
    }
}

const OWNER_EMAILS = ['lshaver.5128@gmail.com', 'lshaver@vault28cards.com'];

// Global state variables
let collections = [];
let products = [];
let reviews = [];
let settings = {
    email: "lshaver@vault28cards.com",
    area: "Summerville, Charleston, and surrounding SC areas (Or secure nationwide shipping)"
};
let inquiries = [];

let tempCards = []; // Highlights list during Sell wizard
let selectedCollectionId = null;
let selectedInquiryId = null;
let uploadedCardImageBase64 = null;
let uploadedGeneralFiles = []; // Base64 strings of uploaded files
let currentActiveRole = 'seller'; // 'seller' or 'buyer' (admin)
let activeAdminTab = 'submissions'; // 'submissions', 'inventory', 'content'
let currentEditingProductId = null;
let selectedProductId = null; // Shop modal product ID
let initialAdminTab = new URLSearchParams(window.location.search).get('adminTab');

// Database listeners
let collectionsListener = null;
let productsListener = null;
let reviewsListener = null;
let settingsListener = null;
let inquiriesListener = null;
let usersListener = null;
let users = [];

// Default Mock Collections Data
const DEFAULT_COLLECTIONS = [
    {
        id: "col-jordan-1986",
        title: "1986 Fleer NBA Rookie Hunt",
        description: "This is a collection of classic 1980s basketball cards. Includes the legendary 1986 Fleer Michael Jordan Rookie Card in amazing condition, plus Spud Webb and Johnny Moore rookies.",
        sport: "Sports Cards",
        sellerName: "Luke S.",
        sellerEmail: "luke.s@gmail.com",
        sellerPhone: "(843) 555-9876",
        sellerPref: "Text Message",
        sellerLocation: "Summerville, SC",
        sellerUid: "sandbox-luke-uid",
        qty: 150,
        estVal: 5400,
        askingPrice: 5400,
        offerPrice: 4800,
        deliveryPref: "Local Pickup",
        status: "Offer Made",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        cards: [
            {
                player: "Michael Jordan",
                brand: "Fleer Rookie #57",
                year: 1986,
                grade: "PSA 8 Near-Mint/Mint",
                image: ""
            },
            {
                player: "Spud Webb",
                brand: "Fleer Rookie #120",
                year: 1986,
                grade: "PSA 9 Mint",
                image: ""
            }
        ],
        generalImages: [],
        messages: [
            {
                sender: "seller",
                senderName: "Luke S.",
                text: "Hey! Submitted my 86 Fleer basketball lot. That Jordan is exceptionally clean.",
                timestamp: new Date(Date.now() - 3600000 * 20).toISOString()
            },
            {
                sender: "buyer",
                senderName: "V28 Buying Desk",
                text: "Hi Luke, thanks for submitting. Based on recent auction prices for a PSA 8 Jordan, we can make you a package offer of $4,800 for the whole collection including Webb.",
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
        id: "col-kobe-vintage",
        title: "1996 Topps Basketball Binder Collection",
        description: "Old childhood binder from 1996. Features Topps Kobe Bryant Rookie card, Allen Iverson Rookie, and Michael Jordan inserts. Most cards were placed in binder pages immediately, looking for a fair offer.",
        sport: "Basketball Cards",
        sellerName: "Marcus T.",
        sellerEmail: "marcus.t@gmail.com",
        sellerPhone: "(843) 555-4321",
        sellerPref: "Email",
        sellerLocation: "Charleston, SC",
        sellerUid: "sandbox-marcus-uid",
        qty: 240,
        estVal: 2000,
        askingPrice: 1800,
        offerPrice: 0,
        deliveryPref: "Shipping Accepted",
        status: "Pending Review",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        cards: [
            {
                player: "Kobe Bryant",
                brand: "Topps Rookie #138",
                year: 1996,
                grade: "Raw (Near Mint or Better)",
                image: ""
            }
        ],
        generalImages: [],
        messages: [
            {
                sender: "seller",
                senderName: "Marcus T.",
                text: "Submitted my old basketball binder. Let me know what you guys think of the Kobe condition.",
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

// Default Mock Shop Products Data
const DEFAULT_PRODUCTS = [
    {
        id: "prod-jordan-1986",
        title: "1986 Fleer Michael Jordan Rookie Card #57",
        description: "The Holy Grail of modern basketball cards. A beautiful PSA 8 specimen. Excellent centering, sharp corners, and deep colors. Fully certified.",
        price: 4800,
        condition: "PSA 8 Near-Mint/Mint",
        category: "Basketball Cards",
        availability: "Available",
        shipping: "$5.00 Insured Shipping / Free Summerville SC Pickup",
        image: "",
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
        id: "prod-lebron-2003",
        title: "2003 Topps Chrome LeBron James Rookie Card #111",
        description: "Immaculate rookie card of King James. A beautiful PSA 9 Mint card from Topps Chrome. Pristine surface and clean edges. Highly sought after collectible.",
        price: 3200,
        condition: "PSA 9 Mint",
        category: "Basketball Cards",
        availability: "Available",
        shipping: "Free Insured Shipping / Local Pickup Available",
        image: "",
        createdAt: new Date(Date.now() - 3600000 * 36).toISOString()
    },
    {
        id: "prod-mahomes-sealed",
        title: "2017 NFL Donruss Optic Retail Blaster Box Sealed",
        description: "Original factory sealed 2017 Donruss Optic Football blaster box. Hunt for Patrick Mahomes rookie cards and holographic parallels.",
        price: 350,
        condition: "Factory Sealed",
        category: "Sealed Boxes & Packs",
        availability: "Available",
        shipping: "$8.00 Shipping / Free Local Pickup",
        image: "",
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
        id: "prod-trout-2011",
        title: "2011 Topps Update Mike Trout Rookie Card #US175",
        description: "The definitive modern baseball rookie card. Graded PSA 10 Gem Mint. Immaculate centering, pristine edges, and crisp registration.",
        price: 1500,
        condition: "PSA 10 Gem Mint",
        category: "Baseball Cards",
        availability: "Sold",
        shipping: "Sold - Local Pickup Summerville SC",
        image: "",
        createdAt: new Date(Date.now() - 3600000 * 96).toISOString()
    }
];

// Default Mock Testimonial Reviews Data
const DEFAULT_REVIEWS = [
    {
        id: "rev-1",
        name: "Mike T.",
        location: "Summerville, SC",
        stars: 5,
        text: "Sold my childhood sports card collection to Vault 28 Trading Co. The online submission took 5 minutes, we negotiated in the live chat, and I got paid cash immediately. Simple, honest, and easy!"
    },
    {
        id: "rev-2",
        name: "Sarah L.",
        location: "Charleston, SC",
        stars: 5,
        text: "Best sports card buyer in South Carolina. Met locally near Summerville for a safe handoff. Got a very fair cash offer for my raw basketball card binders without the eBay seller fees."
    },
    {
        id: "rev-3",
        name: "David K.",
        location: "Columbia, SC",
        stars: 5,
        text: "Had a massive bulk collection of vintage cards. Vault 28 made a solid package offer and coordinated shipping. Great communication and no pressure to sell."
    }
];

// Default Mock Registered Users
const DEFAULT_USERS = [
    {
        uid: "user-1",
        email: "john.doe@gmail.com",
        displayName: "John Doe",
        registeredAt: new Date(Date.now() - 3600000 * 24 * 18).toISOString(),
        lastSeenAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        isOnline: true
    },
    {
        uid: "user-2",
        email: "sarah.smith@yahoo.com",
        displayName: "Sarah Smith",
        registeredAt: new Date(Date.now() - 3600000 * 24 * 32).toISOString(),
        lastSeenAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        isOnline: false
    },
    {
        uid: "user-3",
        email: "michael.b@hotmail.com",
        displayName: "Michael Brown",
        registeredAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
        lastSeenAt: new Date(Date.now() - 60000 * 12).toISOString(),
        isOnline: true
    }
];

// Helper to generate dynamic canvas card mockup image
function generateCardMockupImage(player, year, brand, sport) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    
    // Determine colors
    let colors = ['#1e293b', '#0f172a'];
    let accentColor = '#dfb750';
    const p = player.toLowerCase();
    const s = sport.toLowerCase();
    
    if (p.includes('jordan')) {
        colors = ['#ce1141', '#000000']; // Bulls
        accentColor = '#dfb750';
    } else if (p.includes('mahomes')) {
        colors = ['#e31837', '#ffb612']; // Chiefs
        accentColor = '#ffffff';
    } else if (s.includes('pokemon') || s.includes('tcg') || p.includes('charizard')) {
        colors = ['#2a75d3', '#ffcb05']; // Pokemon Blue/Yellow
        accentColor = '#ff1f1f';
    } else if (sport.includes('Sports')) {
        colors = ['#0a2351', '#002d62']; // Baseball Blue
        accentColor = '#dfb750';
    } else {
        colors = ['#1a1d24', '#282b35'];
        accentColor = '#dfb750';
    }
    
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 300, 420);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 300, 420);
    
    // Inner textures
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(150, 180, 90, 0, Math.PI * 2);
    ctx.stroke();
    
    // Outer border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 15, 270, 390);
    
    // Brand header
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '800 11px "Outfit"';
    ctx.textAlign = 'center';
    ctx.fillText(brand.toUpperCase(), 150, 42);
    
    // Avatar shape placeholder
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(150, 150, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(110, 240);
    ctx.quadraticCurveTo(110, 190, 150, 190);
    ctx.quadraticCurveTo(190, 190, 190, 240);
    ctx.closePath();
    ctx.fill();

    // Box details
    ctx.fillStyle = 'rgba(10, 11, 14, 0.85)';
    ctx.fillRect(30, 300, 240, 80);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(30, 300, 240, 80);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Outfit"';
    ctx.textAlign = 'center';
    ctx.fillText(player, 150, 325);
    
    ctx.fillStyle = accentColor;
    ctx.font = '600 11px "Inter"';
    ctx.fillText(year + ' • ' + sport.toUpperCase(), 150, 345);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '500 9px "Inter"';
    ctx.fillText('VAULT 28 ORIGINAL SLAB MOCKUP', 150, 363);
    
    return canvas.toDataURL();
}

// Database Seeding function for Cloud Firestore
function seedCloudDatabase() {
    // Seed collections
    DEFAULT_COLLECTIONS.forEach(col => {
        col.cards = col.cards.map(card => {
            if (!card.image) card.image = generateCardMockupImage(card.player, card.year, card.brand, col.sport);
            return card;
        });
        db.collection("collections").doc(col.id).set(col);
    });

    // Seed products
    DEFAULT_PRODUCTS.forEach(prod => {
        if (!prod.image) prod.image = generateCardMockupImage(prod.title.split(' ').slice(4).join(' ') || prod.title, 1999, prod.category, prod.category);
        db.collection("products").doc(prod.id).set(prod);
    });

    // Seed reviews
    DEFAULT_REVIEWS.forEach(rev => {
        db.collection("reviews").doc(rev.id).set(rev);
    });

    // Seed config settings
    db.collection("settings").doc("config").set(settings);
}

// Router Implementation
function switchView(viewId, pushState = true) {
    // Auth Guard check for seller dashboard access
    if (isFirebaseActive && !firebase.auth().currentUser) {
        if (viewId === 'seller-dashboard' || viewId === 'seller-detail') {
            openAuthModal('login');
            showToast("Please log in or create an account to view your submissions.", "error");
            return;
        }
    }

    // Role-based view lockout
    if (viewId === 'buyer-dashboard' || viewId === 'buyer-detail') {
        if (isFirebaseActive) {
            const user = firebase.auth().currentUser;
            if (!user || !OWNER_EMAILS.includes(user.email)) {
                switchView('seller-landing', false);
                return;
            }
        }
    }

    // Toggle active classes
    const VIEWS = {
        'seller-landing': document.getElementById('seller-landing'),
        'seller-submit': document.getElementById('seller-submit'),
        'seller-dashboard': document.getElementById('seller-dashboard'),
        'seller-detail': document.getElementById('seller-detail'),
        'customer-thread': document.getElementById('customer-thread'),
        'shop': document.getElementById('shop'),
        'about': document.getElementById('about'),
        'contact': document.getElementById('contact'),
        'buyer-dashboard': document.getElementById('buyer-dashboard'),
        'buyer-detail': document.getElementById('buyer-detail')
    };

    Object.values(VIEWS).forEach(view => {
        if (view) view.classList.remove('active');
    });
    
    if (VIEWS[viewId]) {
        VIEWS[viewId].classList.add('active');
    }
    
    updateNavigationLinks(viewId);
    
    // Call appropriate renderers when entering view states
    if (viewId === 'seller-detail' && selectedCollectionId) {
        renderSellerDetail(selectedCollectionId);
    } else if (viewId === 'buyer-detail' && selectedCollectionId) {
        renderBuyerDetail(selectedCollectionId);
    } else if (viewId === 'seller-dashboard') {
        renderSellerDashboard();
    } else if (viewId === 'buyer-dashboard') {
        renderBuyerDashboard();
    }
    
    // HTML5 History pushState URL update
    if (pushState) {
        let url = ROUTE_MAP[viewId] || '/';
        if (viewId === 'seller-detail' && selectedCollectionId) {
            url += `?id=${selectedCollectionId}`;
        } else if (viewId === 'buyer-detail' && selectedCollectionId) {
            url += `?id=${selectedCollectionId}`;
        } else if (viewId === 'customer-thread' && selectedInquiryId) {
            url += `?id=${selectedInquiryId}`;
        }
        window.history.pushState({ viewId, collectionId: selectedCollectionId, inquiryId: selectedInquiryId }, "", url);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Parse current URL and route cleanly
function handleInitialRouting() {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get('id');
    
    let targetView = PATH_MAP[path] || 'seller-landing';
    
    if (id) {
        if (targetView === 'customer-thread') {
            selectedInquiryId = id;
            loadCustomerThreadDetail(id);
        } else {
            selectedCollectionId = id;
        }
    }
    
    if (initialAdminTab) {
        if (!isFirebaseActive || (firebase.auth().currentUser && OWNER_EMAILS.includes(firebase.auth().currentUser.email))) {
            targetView = 'buyer-dashboard';
            const tabTarget = initialAdminTab;
            initialAdminTab = null;
            setTimeout(() => {
                setRole('buyer');
                setAdminTab(tabTarget);
            }, 150);
        }
    }
    
    switchView(targetView, false);
}

// Back/Forward listener
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.viewId) {
        if (e.state.collectionId) {
            selectedCollectionId = e.state.collectionId;
        }
        if (e.state.inquiryId) {
            selectedInquiryId = e.state.inquiryId;
            loadCustomerThreadDetail(selectedInquiryId);
        }
        switchView(e.state.viewId, false);
    } else {
        handleInitialRouting();
    }
});

// Intercept clicks on links for routing
document.addEventListener('click', (e) => {
    const target = e.target.closest('a');
    if (target && target.getAttribute('href') && target.getAttribute('href').startsWith('/')) {
        const href = target.getAttribute('href');
        if (PATH_MAP[href]) {
            e.preventDefault();
            switchView(PATH_MAP[href]);
        }
    }
});

// Update navbar links based on role
function updateNavigationLinks(activeViewId) {
    const navContainer = document.getElementById('nav-links');
    navContainer.innerHTML = '';
    
    if (currentActiveRole === 'seller') {
        const links = [
            { label: 'Home', view: 'seller-landing' }
        ];
        
        const isUserLoggedIn = isFirebaseActive ? !!firebase.auth().currentUser : (document.getElementById('user-profile-widget').style.display === 'flex');
        if (isUserLoggedIn) {
            links.push({ label: 'My Dashboard', view: 'seller-dashboard' });
        }
        
        links.push(
            { label: 'Sell Your Collection', view: 'seller-submit' },
            { label: 'Shop', view: 'shop' },
            { label: 'About Us', view: 'about' },
            { label: 'Contact', view: 'contact' }
        );
        
        links.forEach(link => {
            const el = document.createElement('a');
            el.className = `nav-link ${activeViewId === link.view ? 'active' : ''}`;
            el.href = ROUTE_MAP[link.view];
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
            { label: 'Admin Dashboard', view: 'buyer-dashboard' }
        ];
        
        links.forEach(link => {
            const el = document.createElement('a');
            el.className = `nav-link ${activeViewId === link.view ? 'active' : ''}`;
            el.href = ROUTE_MAP[link.view];
            el.textContent = link.label;
            el.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(link.view);
            });
            navContainer.appendChild(el);
        });
    }
}

function updateContactFormPreFill(user) {
    const nameInput = document.getElementById('contact-inquiry-name');
    const emailInput = document.getElementById('contact-inquiry-email');
    if (!nameInput || !emailInput) return;
    
    if (user) {
        nameInput.value = user.displayName || user.email.split('@')[0];
        emailInput.value = user.email;
        emailInput.readOnly = true;
        emailInput.style.opacity = '0.7';
    } else {
        nameInput.value = '';
        emailInput.value = '';
        emailInput.readOnly = false;
        emailInput.style.opacity = '1';
    }
}

// Database Synchronization & Initializers
function initDatabase() {
    if (isFirebaseActive) {
        // Setup Firebase Authentication listener
        firebase.auth().onAuthStateChanged((user) => {
            // Unsubscribe existing listeners
            if (collectionsListener) collectionsListener();
            if (productsListener) productsListener();
            if (reviewsListener) reviewsListener();
            if (settingsListener) settingsListener();
            if (usersListener) usersListener();
            if (inquiriesListener) inquiriesListener();
            
            if (user) {
                document.getElementById('auth-widget').style.display = 'none';
                document.getElementById('user-profile-widget').style.display = 'flex';
                document.getElementById('user-display-name').textContent = user.displayName || user.email.split('@')[0];
                
                // Record user activity
                recordUserActivity(user.uid, user.email, user.displayName, false);
                updateContactFormPreFill(user);
                
                const roleLabel = document.getElementById('user-display-role');
                const roleSwitcher = document.getElementById('role-switcher-wrapper');
                
                if (OWNER_EMAILS.includes(user.email)) {
                    roleLabel.textContent = "Vault 28 Owner";
                    roleLabel.style.color = "var(--accent-cyan)";
                    roleSwitcher.style.display = 'flex';
                    document.body.classList.add('has-admin-bar');
                    const toolbar = document.getElementById('admin-toolbar');
                    if (toolbar) toolbar.style.display = 'block';
                    
                    // Listen to users collection
                    usersListener = db.collection("users").onSnapshot((snapshot) => {
                        users = [];
                        snapshot.forEach(doc => {
                            users.push({ id: doc.id, ...doc.data() });
                        });
                        users.sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0));
                        renderAdminUsersTable();
                    });

                    // Listen to inquiries collection
                    inquiriesListener = db.collection("inquiries").onSnapshot((snapshot) => {
                        inquiries = [];
                        snapshot.forEach(doc => {
                            inquiries.push({ id: doc.id, ...doc.data() });
                        });
                        inquiries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                        updateInquiriesBadge();
                        renderAdminInquiriesList();
                        renderCustomerDashboardInquiries();
                    });

                    // Only automatically redirect if they clicked a direct deep-link (like from an email)
                    if (initialAdminTab) {
                        const tabTarget = initialAdminTab;
                        initialAdminTab = null;
                        setTimeout(() => {
                            setRole('buyer');
                            setAdminTab(tabTarget);
                        }, 200);
                    } else {
                        // Otherwise, load in seller view so they can browse the public site
                        setTimeout(() => {
                            setRole('seller');
                        }, 200);
                    }
                } else {
                    roleLabel.textContent = "Seller Account";
                    roleLabel.style.color = "var(--text-secondary)";
                    roleSwitcher.style.display = 'none';
                    document.body.classList.remove('has-admin-bar');
                    const toolbar = document.getElementById('admin-toolbar');
                    if (toolbar) toolbar.style.display = 'none';
                    setRole('seller');
                }

                // Query collections based on user
                let query = db.collection("collections");
                if (!OWNER_EMAILS.includes(user.email)) {
                    query = query.where("sellerUid", "==", user.uid);
                }

                collectionsListener = query.onSnapshot((snapshot) => {
                    collections = [];
                    snapshot.forEach(doc => {
                        collections.push({ id: doc.id, ...doc.data() });
                    });
                    collections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    
                    triggerUIRefresh();
                });

                // Listen to inquiries matching user's email if they are a regular customer
                if (!OWNER_EMAILS.includes(user.email)) {
                    inquiriesListener = db.collection("inquiries").where("email", "==", user.email).onSnapshot((snapshot) => {
                        inquiries = [];
                        snapshot.forEach(doc => {
                            inquiries.push({ id: doc.id, ...doc.data() });
                        });
                        inquiries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                        renderCustomerDashboardInquiries();
                    }, (error) => {
                        console.warn("Failed to listen to inquiries:", error);
                    });
                }

            } else {
                document.getElementById('auth-widget').style.display = 'flex';
                document.getElementById('user-profile-widget').style.display = 'none';
                document.getElementById('role-switcher-wrapper').style.display = 'none';
                document.body.classList.remove('has-admin-bar');
                const toolbar = document.getElementById('admin-toolbar');
                if (toolbar) toolbar.style.display = 'none';
                
                updateContactFormPreFill(null);
                collections = [];
                users = [];
                setRole('seller');
                handleInitialRouting();
                triggerUIRefresh();
            }

            // Sync public products
            productsListener = db.collection("products").onSnapshot(snapshot => {
                products = [];
                snapshot.forEach(doc => {
                    products.push({ id: doc.id, ...doc.data() });
                });
                products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                renderShopCatalog();
                renderFeaturedInventory();
                renderAdminInventoryTable();
            });

            // Sync public reviews
            reviewsListener = db.collection("reviews").onSnapshot(snapshot => {
                reviews = [];
                snapshot.forEach(doc => {
                    reviews.push({ id: doc.id, ...doc.data() });
                });
                renderPublicReviews();
                renderAdminReviewsList();
            });

            // Sync settings
            settingsListener = db.collection("settings").doc("config").onSnapshot(doc => {
                if (doc.exists) {
                    settings = doc.data();
                    renderSettingsDetails();
                }
            });
        });
    } else {
        // Local Sandbox Fallback
        const storedCol = localStorage.getItem('v28_collections');
        const storedProd = localStorage.getItem('v28_products');
        const storedRev = localStorage.getItem('v28_reviews');
        const storedSet = localStorage.getItem('v28_settings');
        
        if (storedCol) collections = JSON.parse(storedCol);
        else {
            collections = DEFAULT_COLLECTIONS.map(col => {
                col.cards = col.cards.map(card => {
                    card.image = generateCardMockupImage(card.player, card.year, card.brand, col.sport);
                    return card;
                });
                return col;
            });
            saveLocalCollections();
        }

        if (storedProd) products = JSON.parse(storedProd);
        else {
            products = DEFAULT_PRODUCTS.map(prod => {
                prod.image = generateCardMockupImage(prod.title.split(' ').slice(4).join(' ') || prod.title, 2026, prod.category, prod.category);
                return prod;
            });
            saveLocalProducts();
        }

        if (storedRev) reviews = JSON.parse(storedRev);
        else {
            reviews = DEFAULT_REVIEWS;
            saveLocalReviews();
        }

        if (storedSet) settings = JSON.parse(storedSet);
        else {
            saveLocalSettings();
        }

        // Initialize sandbox users
        let storedUsers = localStorage.getItem('v28_users');
        if (storedUsers) {
            users = JSON.parse(storedUsers);
        } else {
            users = [...DEFAULT_USERS];
            localStorage.setItem('v28_users', JSON.stringify(users));
        }

        // Initialize sandbox inquiries
        const storedInq = localStorage.getItem('v28_inquiries');
        if (storedInq) {
            inquiries = JSON.parse(storedInq);
        } else {
            inquiries = [];
            localStorage.setItem('v28_inquiries', JSON.stringify(inquiries));
        }

        // Mark local tester user as active
        recordUserActivity('sandbox-user', 'lshaver@vault28cards.com', 'Local Tester', false);

        document.getElementById('auth-widget').style.display = 'none';
        document.getElementById('user-profile-widget').style.display = 'flex';
        document.getElementById('user-display-name').textContent = "Local Tester";
        document.getElementById('user-display-role').textContent = "Sandbox Mode";
        document.getElementById('role-switcher-wrapper').style.display = 'flex';
        document.body.classList.add('has-admin-bar');
        const toolbar = document.getElementById('admin-toolbar');
        if (toolbar) toolbar.style.display = 'block';

        triggerUIRefresh();
        renderShopCatalog();
        renderFeaturedInventory();
        renderPublicReviews();
        renderAdminInventoryTable();
        renderAdminReviewsList();
        renderSettingsDetails();
        updateInquiriesBadge();
        renderAdminInquiriesList();
        handleInitialRouting();
    }
}

// Database save helpers (Local sandbox mode)
function saveLocalCollections() { localStorage.setItem('v28_collections', JSON.stringify(collections)); }
function saveLocalProducts() { localStorage.setItem('v28_products', JSON.stringify(products)); }
function saveLocalReviews() { localStorage.setItem('v28_reviews', JSON.stringify(reviews)); }
function saveLocalSettings() { localStorage.setItem('v28_settings', JSON.stringify(settings)); }

function triggerUIRefresh() {
    document.getElementById('admin-badge-submissions').textContent = collections.length;
    document.getElementById('admin-badge-inventory').textContent = products.length;
    
    const badgeUsers = document.getElementById('admin-badge-users');
    if (badgeUsers) badgeUsers.textContent = users.length;
    
    renderSellerDashboard();
    renderBuyerDashboard();
    renderRecentlyPurchasedGallery();
    renderAdminUsersTable();
    
    if (selectedCollectionId) {
        const viewSeller = document.getElementById('seller-detail');
        const viewAdmin = document.getElementById('buyer-detail');
        if (viewSeller && viewSeller.classList.contains('active')) {
            renderSellerDetail(selectedCollectionId);
        }
        if (viewAdmin && viewAdmin.classList.contains('active')) {
            renderBuyerDetail(selectedCollectionId);
        }
    }
}

// Role Switcher
function setRole(role) {
    currentActiveRole = role;
    const btnSeller = document.getElementById('btn-role-seller');
    const btnBuyer = document.getElementById('btn-role-buyer');
    
    if (role === 'seller') {
        btnSeller.classList.add('active');
        btnBuyer.classList.remove('active');
        document.getElementById('buyer-update-dot').style.display = 'none';
        switchView('seller-landing');
    } else {
        if (isFirebaseActive) {
            const user = firebase.auth().currentUser;
            if (!user || !OWNER_EMAILS.includes(user.email)) {
                showToast("Owner authorization required.", "error");
                setRole('seller');
                return;
            }
        }
        btnBuyer.classList.add('active');
        btnSeller.classList.remove('active');
        switchView('buyer-dashboard');
    }
}

// Toast Manager
function showToast(message, type = 'info') {
    const container = document.body;
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        container.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'success' : ''}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '🔔'}</span> ${message}`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}


// ==================== AUTH CONTROLLERS ====================
let authModalMode = 'login';
function openAuthModal(mode = 'login') {
    authModalMode = mode;
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'flex';
    
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const nameGroup = document.getElementById('auth-name-group');
    const btnSubmit = document.getElementById('btn-auth-submit');
    
    document.getElementById('auth-form').reset();
    const reqBox = document.getElementById('auth-password-requirements');
    if (reqBox) reqBox.style.display = 'none';
    
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
    const reqBox = document.getElementById('auth-password-requirements');
    if (reqBox) reqBox.style.display = 'none';
}

document.getElementById('tab-login').addEventListener('click', () => openAuthModal('login'));
document.getElementById('tab-signup').addEventListener('click', () => openAuthModal('signup'));
document.getElementById('btn-close-auth-modal').addEventListener('click', closeAuthModal);

// Dynamic Password strength checkers
const authPasswordInput = document.getElementById('auth-password');
if (authPasswordInput) {
    authPasswordInput.addEventListener('input', () => {
        const reqBox = document.getElementById('auth-password-requirements');
        if (!reqBox) return;
        
        if (authModalMode === 'signup') {
            reqBox.style.display = 'flex';
            const val = authPasswordInput.value;
            
            // 1. Length >= 8
            const reqLength = document.getElementById('req-length');
            if (val.length >= 8) {
                reqLength.innerHTML = '✔️ At least 8 characters';
                reqLength.style.color = '#10b981';
            } else {
                reqLength.innerHTML = '❌ At least 8 characters';
                reqLength.style.color = 'var(--text-secondary)';
            }
            
            // 2. Upper & Lowercase
            const reqCase = document.getElementById('req-case');
            if (/[A-Z]/.test(val) && /[a-z]/.test(val)) {
                reqCase.innerHTML = '✔️ Upper & lowercase letter';
                reqCase.style.color = '#10b981';
            } else {
                reqCase.innerHTML = '❌ Upper & lowercase letter';
                reqCase.style.color = 'var(--text-secondary)';
            }
            
            // 3. One number
            const reqNumber = document.getElementById('req-number');
            if (/[0-9]/.test(val)) {
                reqNumber.innerHTML = '✔️ At least one number';
                reqNumber.style.color = '#10b981';
            } else {
                reqNumber.innerHTML = '❌ At least one number';
                reqNumber.style.color = 'var(--text-secondary)';
            }
            
            // 4. One special character
            const reqSpecial = document.getElementById('req-special');
            if (/[!@#$%^&*(),.?":{}|<>]/.test(val)) {
                reqSpecial.innerHTML = '✔️ One special character (!@#$%^&*)';
                reqSpecial.style.color = '#10b981';
            } else {
                reqSpecial.innerHTML = '❌ One special character (!@#$%^&*)';
                reqSpecial.style.color = 'var(--text-secondary)';
            }
        } else {
            reqBox.style.display = 'none';
        }
    });
}

function validatePasswordRequirements(password) {
    if (password.length < 8) {
        return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
        return "Password must contain both uppercase and lowercase letters.";
    }
    if (!/[0-9]/.test(password)) {
        return "Password must contain at least one number.";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return "Password must contain at least one special character.";
    }
    return null;
}
document.getElementById('btn-header-signin').addEventListener('click', () => openAuthModal('login'));
document.getElementById('btn-header-signup').addEventListener('click', () => openAuthModal('signup'));
document.getElementById('btn-header-signout').addEventListener('click', () => {
    if (isFirebaseActive) {
        const user = firebase.auth().currentUser;
        if (user) {
            setUserOffline(user.uid);
        }
        firebase.auth().signOut().then(() => showToast("Signed out successfully."));
    } else {
        setUserOffline('sandbox-user');
        document.getElementById('auth-widget').style.display = 'flex';
        document.getElementById('user-profile-widget').style.display = 'none';
        document.getElementById('role-switcher-wrapper').style.display = 'none';
        document.body.classList.remove('has-admin-bar');
        const toolbar = document.getElementById('admin-toolbar');
        if (toolbar) toolbar.style.display = 'none';
        
        users.forEach(u => u.isOnline = false);
        localStorage.setItem('v28_users', JSON.stringify(users));
        
        setRole('seller');
        showToast("Signed out successfully.");
    }
});

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim();
    const btnSubmit = document.getElementById('btn-auth-submit');
    
    // Check form fields match validation requirements
    if (authModalMode === 'signup' && !name) {
        showToast("Please fill in your full name.", "error");
        return;
    }
    if (!email || !email.includes('@') || email.indexOf('.') === -1) {
        showToast("Please enter a valid email address.", "error");
        return;
    }
    
    // Enforce password requirements on registration/sign-up
    if (authModalMode === 'signup') {
        const passwordError = validatePasswordRequirements(password);
        if (passwordError) {
            showToast(passwordError, "error");
            return;
        }
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Processing...";
    
    if (isFirebaseActive) {
        if (authModalMode === 'login') {
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((cred) => {
                    // Check if email is verified (exempt owner emails)
                    if (!cred.user.emailVerified && !OWNER_EMAILS.includes(cred.user.email.toLowerCase())) {
                        showToast("Please verify your email address. We sent a link to your inbox.", "warning");
                        firebase.auth().signOut().then(() => {
                            closeAuthModal();
                        });
                    } else {
                        closeAuthModal();
                        showToast("Welcome back!", "success");
                    }
                })
                .catch(err => showToast(err.message, "error"))
                .finally(() => {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Log In';
                });
        } else {
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then(cred => {
                    cred.user.updateProfile({ displayName: name }).then(() => {
                        // Send verification email link
                        cred.user.sendEmailVerification()
                            .then(() => {
                                showToast("Verification email sent! Please check your inbox and verify to activate your account.", "success");
                            })
                            .catch(err => {
                                console.warn("Failed to send verification email:", err);
                                showToast("Could not send verification email link.", "error");
                            });
                        
                        recordUserActivity(cred.user.uid, cred.user.email, name, true);
                        
                        // Immediately sign out to enforce verification on next login
                        firebase.auth().signOut().then(() => {
                            closeAuthModal();
                        });
                    });
                })
                .catch(err => showToast(err.message, "error"))
                .finally(() => {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Create Account';
                });
        }
    } else {
        // Sandbox mode mock registration and login simulation
        setTimeout(() => {
            btnSubmit.disabled = false;
            
            if (authModalMode === 'login') {
                let localUsers = [];
                const stored = localStorage.getItem('v28_users');
                if (stored) localUsers = JSON.parse(stored);
                else localUsers = [...DEFAULT_USERS];
                
                // Allow logging back in as the owner
                if (OWNER_EMAILS.includes(email.toLowerCase())) {
                    document.getElementById('auth-widget').style.display = 'none';
                    document.getElementById('user-profile-widget').style.display = 'flex';
                    document.getElementById('user-display-name').textContent = "Lucas Shaver";
                    document.getElementById('user-display-role').textContent = "Vault 28 Owner";
                    document.getElementById('role-switcher-wrapper').style.display = 'flex';
                    document.body.classList.add('has-admin-bar');
                    const toolbar = document.getElementById('admin-toolbar');
                    if (toolbar) toolbar.style.display = 'block';
                    
                    recordUserActivity('owner-uid', email, 'Lucas Shaver', false);
                    closeAuthModal();
                    showToast("Welcome back, Lucas!", "success");
                    triggerUIRefresh();
                    return;
                }
                
                const foundUser = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
                if (foundUser) {
                    document.getElementById('auth-widget').style.display = 'none';
                    document.getElementById('user-profile-widget').style.display = 'flex';
                    document.getElementById('user-display-name').textContent = foundUser.displayName;
                    document.getElementById('user-display-role').textContent = "Seller Account";
                    document.getElementById('role-switcher-wrapper').style.display = 'none';
                    document.body.classList.remove('has-admin-bar');
                    const toolbar = document.getElementById('admin-toolbar');
                    if (toolbar) toolbar.style.display = 'none';
                    
                    recordUserActivity(foundUser.uid, foundUser.email, foundUser.displayName, false);
                    closeAuthModal();
                    showToast("Welcome back!", "success");
                    triggerUIRefresh();
                } else {
                    showToast("Account not found. Please register in sandbox mode.", "error");
                }
            } else {
                const mockUid = 'mock-user-' + Math.random().toString(36).substr(2, 9);
                
                document.getElementById('auth-widget').style.display = 'none';
                document.getElementById('user-profile-widget').style.display = 'flex';
                document.getElementById('user-display-name').textContent = name;
                document.getElementById('user-display-role').textContent = "Seller Account";
                document.getElementById('role-switcher-wrapper').style.display = 'none';
                document.body.classList.remove('has-admin-bar');
                const toolbar = document.getElementById('admin-toolbar');
                if (toolbar) toolbar.style.display = 'none';
                
                recordUserActivity(mockUid, email, name, true);
                closeAuthModal();
                showToast(`Welcome, ${name}!`, "success");
                triggerUIRefresh();
            }
        }, 500);
    }
});


// ==================== SELLER WIZARD SUBMISSIONS ====================

// client-side image compression utility
function compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
            return;
        }
        
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            URL.revokeObjectURL(img.src);
            resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
    });
}

// client-side standard email template generator
function generateStandardEmailHtml(title, bodyHtml, actionButtonHtml = '') {
    const logoUrl = `${window.location.origin}/assets/logo_transparent.png`;
    return `
        <div style="background-color: #0c0f19; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center;">
            <!-- Brand Header -->
            <div style="max-width: 600px; margin: 0 auto; padding-bottom: 20px; text-align: left; border-bottom: 1px solid rgba(223, 183, 80, 0.25);">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="vertical-align: middle; width: 60px; padding-right: 15px;">
                            <img src="${logoUrl}" alt="Vault 28 Logo" style="width: 50px; height: 50px; border-radius: 50%; display: block; border: 1px solid rgba(223, 183, 80, 0.3);" />
                        </td>
                        <td style="vertical-align: middle;">
                            <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                                VAULT <span style="color: #dfb750;">28</span>
                            </h1>
                            <p style="color: #9ca3af; font-size: 11px; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Trading Co.</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Main Container -->
            <div style="max-width: 600px; margin: 20px auto 0 auto; background-color: #121624; border: 1px solid #1f293d; border-radius: 12px; overflow: hidden; text-align: left; padding: 30px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 15px;">${title}</h2>
                ${bodyHtml}
                
                ${actionButtonHtml ? `
                <div style="text-align: center; margin-top: 30px;">
                    ${actionButtonHtml}
                </div>
                ` : ''}
            </div>
            
            <!-- Footer -->
            <div style="max-width: 600px; margin: 25px auto 0 auto; text-align: center; color: #64748b; font-size: 11px; line-height: 1.5;">
                <p style="margin: 0;">This email was automatically generated by the Vault 28 Trading Co. system.</p>
                <p style="margin: 5px 0 0 0;">© 2026 Vault 28 Trading Co. All rights reserved. • Summerville, SC</p>
            </div>
        </div>
    `;
}

// Highlight Dropzone Image uploads
const cardDropzone = document.getElementById('card-dropzone');
const cardFileInput = document.getElementById('card-file-input');
const cardPreview = document.getElementById('card-images-preview');

cardDropzone.addEventListener('click', () => cardFileInput.click());
cardFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        compressImage(file, 800, 800, 0.75)
            .then(base64 => {
                uploadedCardImageBase64 = base64;
                cardPreview.innerHTML = `
                    <div class="uploaded-preview-item">
                        <img src="${uploadedCardImageBase64}">
                        <button type="button" class="uploaded-preview-remove" id="btn-remove-card-img">×</button>
                    </div>
                `;
                document.getElementById('btn-remove-card-img').addEventListener('click', () => {
                    uploadedCardImageBase64 = null;
                    cardPreview.innerHTML = '';
                });
            })
            .catch(err => {
                console.error("Compression failed:", err);
                showToast("Failed to process image.", "error");
            });
    }
});

// Add card highlight to submission list
document.getElementById('btn-add-card-to-list').addEventListener('click', () => {
    const player = document.getElementById('card-player').value.trim();
    const brand = document.getElementById('card-brand').value.trim();
    const year = document.getElementById('card-year').value;
    const grade = document.getElementById('card-grade').value;
    const sport = document.getElementById('collection-sport').value;
    
    if (!player || !brand || !year) {
        showToast("Please enter player, set, and year details.", "error");
        return;
    }
    
    const image = uploadedCardImageBase64 || generateCardMockupImage(player, year, brand, sport);
    tempCards.push({ player, brand, year: parseInt(year), grade, image });
    
    renderTempCardsList();
    
    document.getElementById('card-player').value = '';
    document.getElementById('card-brand').value = '';
    document.getElementById('card-year').value = '';
    uploadedCardImageBase64 = null;
    cardPreview.innerHTML = '';
    
    showToast(`Added ${player} highlight!`);
});

function renderTempCardsList() {
    const container = document.getElementById('temp-cards-list');
    document.getElementById('cards-count-badge').textContent = tempCards.length;
    
    if (tempCards.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 1.5rem; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 8px; font-size: 0.9rem;">No specific highlights cataloged yet.</div>`;
        return;
    }
    
    container.innerHTML = '';
    tempCards.forEach((card, idx) => {
        const row = document.createElement('div');
        row.className = 'card-item-row';
        row.innerHTML = `
            <img class="card-item-img" src="${card.image}">
            <div class="card-item-details">
                <div class="card-item-name">${card.player}</div>
                <div class="card-item-meta">${card.year} ${card.brand} • <span style="color:var(--accent-cyan); font-weight:500;">${card.grade}</span></div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" style="color:var(--accent-red); padding: 2px 6px;" onclick="removeTempCard(${idx})">Remove</button>
        `;
        container.appendChild(row);
    });
}

window.removeTempCard = function(idx) {
    tempCards.splice(idx, 1);
    renderTempCardsList();
};

// General Files Upload Dropzone (multi-photos / video)
const genDropzone = document.getElementById('general-dropzone');
const genFileInput = document.getElementById('general-file-input');
const genPreview = document.getElementById('general-images-preview');

genDropzone.addEventListener('click', () => genFileInput.click());
genFileInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        const isVideo = file.type.startsWith('video/');
        const id = Math.random().toString(36).substr(2, 9);
        
        if (isVideo) {
            const reader = new FileReader();
            reader.onload = (el) => {
                const base64 = el.target.result;
                uploadedGeneralFiles.push({ id, base64, isVideo: true });
                renderGeneralPreviewList();
            };
            reader.readAsDataURL(file);
        } else {
            compressImage(file, 1024, 1024, 0.7)
                .then(base64 => {
                    uploadedGeneralFiles.push({ id, base64, isVideo: false });
                    renderGeneralPreviewList();
                })
                .catch(err => {
                    console.error("Compression failed:", err);
                    showToast("Failed to process photo.", "error");
                });
        }
    });
});

function renderGeneralPreviewList() {
    genPreview.innerHTML = '';
    uploadedGeneralFiles.forEach((file) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'uploaded-preview-item';
        if (file.isVideo) {
            wrapper.innerHTML = `
                <video src="${file.base64}" muted autoplay loop></video>
                <button type="button" class="uploaded-preview-remove" onclick="removeGeneralUpload('${file.id}')">×</button>
            `;
        } else {
            wrapper.innerHTML = `
                <img src="${file.base64}">
                <button type="button" class="uploaded-preview-remove" onclick="removeGeneralUpload('${file.id}')">×</button>
            `;
        }
        genPreview.appendChild(wrapper);
    });
}

window.removeGeneralUpload = function(id) {
    uploadedGeneralFiles = uploadedGeneralFiles.filter(f => f.id !== id);
    renderGeneralPreviewList();
};

function resetSubmissionFormState() {
    document.getElementById('submission-form').reset();
    tempCards = [];
    uploadedGeneralFiles = [];
    uploadedCardImageBase64 = null;
    cardPreview.innerHTML = '';
    genPreview.innerHTML = '';
    renderTempCardsList();
    
    // Reset wizard state
    currentWizardStep = 1;
    updateWizardUI();
    
    document.getElementById('submission-success-box').style.display = 'none';
    document.getElementById('submission-card-box').style.display = 'block';
}

// Submission Form Submit Handler
document.getElementById('submission-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (isFirebaseActive && !firebase.auth().currentUser) {
        openAuthModal('login');
        showToast("Please register or sign in to submit your cards.", "error");
        return;
    }
    
    if (uploadedGeneralFiles.length === 0) {
        showToast("Please upload at least one photo of your collection.", "error");
        return;
    }
    
    if (!document.getElementById('collection-ownership-check').checked) {
        showToast("Please confirm that you legally own the collection.", "error");
        return;
    }
    
    const sellerName = document.getElementById('collection-seller-name').value.trim();
    const sellerEmail = document.getElementById('collection-seller-email').value.trim();
    const sellerPhone = document.getElementById('collection-seller-phone').value.trim();
    const sellerPref = document.getElementById('collection-seller-pref').value;
    const sellerLocation = document.getElementById('collection-seller-location').value.trim();
    const sport = document.getElementById('collection-sport').value;
    const qty = parseInt(document.getElementById('collection-qty').value);
    const estVal = parseFloat(document.getElementById('collection-est-val').value) || 0;
    const asking = parseFloat(document.getElementById('collection-asking').value) || 0;
    const desc = document.getElementById('collection-desc').value.trim();
    const deliveryPref = document.getElementById('collection-delivery-pref').value;
    
    const user = isFirebaseActive ? firebase.auth().currentUser : null;
    
    const newCol = {
        id: 'col-' + Math.random().toString(36).substr(2, 9),
        title: `${sellerName}'s ${sport} Lot`,
        description: desc,
        sport,
        sellerName,
        sellerEmail,
        sellerPhone,
        sellerPref,
        sellerLocation,
        sellerUid: user ? user.uid : 'sandbox-uid',
        qty,
        estVal,
        askingPrice: asking,
        offerPrice: 0,
        deliveryPref,
        status: 'New',
        createdAt: new Date().toISOString(),
        cards: [...tempCards],
        generalImages: [...uploadedGeneralFiles],
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
        db.collection("collections").doc(newCol.id).set(newCol)
            .then(() => {
                // 1. Send receipt email to the seller thanking them
                const sellerReceiptMail = {
                    to: sellerEmail,
                    message: {
                        subject: `We've Received Your Collection Submission!`,
                        html: generateStandardEmailHtml(
                            `Hi ${sellerName},`,
                            `
                            <p>Thank you for submitting your card collection lot to Vault 28! We have received your submission details and our Buying Desk is already reviewing them.</p>
                            
                            <p style="color: #dfb750; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; margin: 20px 0 10px 0;">Submission Overview</p>
                            <div style="background-color: #0c0f19; border: 1px solid #1f293d; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
                                    <tr>
                                        <td style="padding: 6px 0; color: #94a3b8; width: 140px;">Collection Type:</td>
                                        <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${sport}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #94a3b8;">Item Count:</td>
                                        <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">~${qty} items</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #94a3b8;">Asking Price:</td>
                                        <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${asking > 0 ? '$' + asking : 'Not specified (looking for offer)'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #94a3b8;">Preference:</td>
                                        <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${deliveryPref}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p><strong>What's Next?</strong></p>
                            <p>Lucas will inspect your description, catalog items, and attached photos. We will reach back out to you via your preferred method (<strong>${sellerPref}</strong>) within 24 hours with either a direct cash purchase offer or request for more details.</p>
                            <p>You can also track updates and communicate directly with us by logging into your account dashboard.</p>
                            `,
                            `<a href="${window.location.origin}/?tab=dashboard" style="display: inline-block; background: linear-gradient(135deg, #f5d075 0%, #dfb750 100%); color: #0c0f19; font-weight: 700; font-size: 13px; padding: 12px 28px; text-decoration: none; border-radius: 25px; box-shadow: 0 4px 12px rgba(223, 183, 80, 0.25); text-transform: uppercase; letter-spacing: 0.08em;">Go to My Dashboard</a>`
                        )
                    }
                };

                // 2. Send notification email to the owner (Lucas)
                let generalPhotosHtml = '';
                if (uploadedGeneralFiles && uploadedGeneralFiles.length > 0) {
                    generalPhotosHtml = `
                        <p style="color: #dfb750; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; margin: 20px 0 10px 0;">Attached Photos</p>
                        <div style="background-color: #0c0f19; border: 1px solid #1f293d; border-radius: 8px; padding: 15px; color: #cbd5e1; font-size: 14px;">
                            ${uploadedGeneralFiles.map((f, i) => f.isVideo ? `<p style="font-size:12px; color:#94a3b8;">[Video Attachment ${i+1}]</p>` : `<img src="${f.base64}" alt="Collection Attachment ${i + 1}" style="max-width: 100%; border-radius: 6px; border: 1px solid #1f293d; margin-bottom: 10px; display: block;" />`).join('')}
                        </div>
                    `;
                }

                const ownerNotificationMail = {
                    to: 'lshaver@vault28cards.com',
                    replyTo: sellerEmail,
                    message: {
                        subject: `New Collection Lot Submitted: ${sellerName} - ${sport}`,
                        html: generateStandardEmailHtml(
                            `New Collection Submitted for Valuation`,
                            `
                            <p>A new collection lot has been submitted by <strong>${sellerName}</strong> (${sellerEmail}, ${sellerPhone}).</p>
                            
                            <p style="color: #dfb750; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; margin: 20px 0 10px 0;">Seller Info & Preferences</p>
                            <div style="background-color: #0c0f19; border: 1px solid #1f293d; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
                                    <tr><td style="padding: 4px 0; color: #94a3b8; width: 140px;">Seller Name:</td><td style="padding: 4px 0; color: #ffffff;">${sellerName}</td></tr>
                                    <tr><td style="padding: 4px 0; color: #94a3b8;">Email Address:</td><td style="padding: 4px 0; color: #ffffff;">${sellerEmail}</td></tr>
                                    <tr><td style="padding: 4px 0; color: #94a3b8;">Phone Number:</td><td style="padding: 4px 0; color: #ffffff;">${sellerPhone}</td></tr>
                                    <tr><td style="padding: 4px 0; color: #94a3b8;">Location:</td><td style="padding: 4px 0; color: #ffffff;">${sellerLocation}</td></tr>
                                    <tr><td style="padding: 4px 0; color: #94a3b8;">Contact Method:</td><td style="padding: 4px 0; color: #ffffff;">${sellerPref}</td></tr>
                                </table>
                            </div>

                            <p style="color: #dfb750; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; margin: 20px 0 10px 0;">Collection Details</p>
                            <div style="background-color: #0c0f19; border: 1px solid #1f293d; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
                                    <tr><td style="padding: 4px 0; color: #94a3b8; width: 140px;">Collection Type:</td><td style="padding: 4px 0; color: #ffffff;">${sport}</td></tr>
                                    <tr><td style="padding: 4px 0; color: #94a3b8;">Item Count:</td><td style="padding: 4px 0; color: #ffffff;">~${qty}</td></tr>
                                    <tr><td style="padding: 4px 0; color: #94a3b8;">Estimated Value:</td><td style="padding: 4px 0; color: #ffffff;">$${estVal}</td></tr>
                                    <tr><td style="padding: 4px 0; color: #94a3b8;">Asking Price:</td><td style="padding: 4px 0; color: #ffffff;">$${asking}</td></tr>
                                    <tr><td style="padding: 4px 0; color: #94a3b8;">Delivery Preference:</td><td style="padding: 4px 0; color: #ffffff;">${deliveryPref}</td></tr>
                                </table>
                            </div>

                            <p style="color: #dfb750; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; margin: 20px 0 10px 0;">Seller Description</p>
                            <div style="background-color: #0c0f19; border: 1px solid #1f293d; border-radius: 8px; padding: 15px; color: #ffffff; white-space: pre-wrap; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">${desc}</div>

                            ${generalPhotosHtml}
                            `,
                            `<a href="${window.location.origin}/?adminTab=collections" style="display: inline-block; background: linear-gradient(135deg, #f5d075 0%, #dfb750 100%); color: #0c0f19; font-weight: 700; font-size: 13px; padding: 12px 28px; text-decoration: none; border-radius: 25px; box-shadow: 0 4px 12px rgba(223, 183, 80, 0.25); text-transform: uppercase; letter-spacing: 0.08em;">Open Buying Desk Console</a>`
                        )
                    }
                };

                return Promise.all([
                    db.collection("mail").add(sellerReceiptMail),
                    db.collection("mail").add(ownerNotificationMail)
                ]);
            })
            .then(() => {
                document.getElementById('submission-card-box').style.display = 'none';
                document.getElementById('submission-success-box').style.display = 'block';
                showToast("Collection submitted successfully!", "success");
            })
            .catch(err => {
                console.error("Firestore submission failed:", err);
                showToast("Failed to upload to database.", "error");
            });
    } else {
        collections.push(newCol);
        saveLocalCollections();
        document.getElementById('submission-card-box').style.display = 'none';
        document.getElementById('submission-success-box').style.display = 'block';
        showToast("Collection saved in local sandbox!", "success");
        triggerUIRefresh();
    }
});
// ==================== SELLER DASHBOARD RENDERS ====================

window.deleteCollectionFromDashboard = function(colId) {
    if (!confirm("Are you sure you want to delete this collection submission? This action cannot be undone.")) return;
    
    if (isFirebaseActive) {
        db.collection("collections").doc(colId).delete()
            .then(() => {
                showToast("Collection submission deleted.", "success");
            })
            .catch(err => {
                console.error("Error deleting collection:", err);
                showToast("Could not delete collection from database.", "error");
            });
    } else {
        collections = collections.filter(c => c.id !== colId);
        saveLocalCollections();
        showToast("Collection submission deleted from sandbox.", "success");
        triggerUIRefresh();
    }
};

function renderSellerDashboard() {
    const listContainer = document.getElementById('seller-collections-list');
    listContainer.innerHTML = '';
    
    if (collections.length === 0) {
        listContainer.innerHTML = `
            <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-secondary);">
                <p style="font-size: 1.2rem; margin-bottom: 1.5rem;">You haven't submitted any card collections yet.</p>
                <button class="btn btn-primary" onclick="switchView('seller-submit')">Submit My First Collection</button>
            </div>
        `;
    } else {
        collections.forEach(col => {
            const card = document.createElement('div');
            card.className = 'glass-card collection-card';
            card.addEventListener('click', () => {
                selectedCollectionId = col.id;
                switchView('seller-detail');
            });
            
            let badgeClass = 'badge-pending';
            if (col.status === 'Reviewing' || col.status === 'Negotiating') badgeClass = 'badge-negotiating';
            if (col.status === 'Offer Made') badgeClass = 'badge-offer';
            if (col.status === 'Bought' || col.status === 'Purchased' || col.status === 'Accepted') badgeClass = 'badge-bought';
            if (col.status === 'Declined') badgeClass = 'badge-declined';
            
            let previewHtml = '';
            col.cards.slice(0, 4).forEach(c => {
                previewHtml += `<img class="collection-preview-thumb" src="${c.image}">`;
            });
            if (col.cards.length > 4) {
                previewHtml += `<div class="collection-preview-placeholder">+${col.cards.length - 4}</div>`;
            }
            
            let priceText = `Asking: $${col.askingPrice.toLocaleString()}`;
            if (col.status === 'Offer Made') priceText = `Offer: $${col.offerPrice.toLocaleString()}`;
            if (col.status === 'Bought' || col.status === 'Purchased' || col.status === 'Accepted') priceText = `Bought: $${col.offerPrice.toLocaleString()}`;
            
            card.innerHTML = `
                <div>
                    <div class="collection-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge ${badgeClass}">${col.status}</span>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(col.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button class="delete-col-btn" style="background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.15); color: #ef4444; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" title="Delete Collection">
                            🗑️
                        </button>
                    </div>
                    <h3 class="collection-title" style="margin-top: 0;">${col.title}</h3>
                    <div class="collection-meta">
                        <span>📦 ${col.qty} Items</span>
                        <span>🃏 ${col.cards.length} Highlights</span>
                    </div>
                    <div class="collection-preview-row" style="margin-top:1rem;">${previewHtml}</div>
                </div>
                <div class="collection-card-footer" style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.75rem;">
                    <span class="price-val" style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${priceText}</span>
                    <span style="font-size: 0.85rem; color: var(--accent-cyan); font-weight: 600;">Inspect Offer →</span>
                </div>
            `;
            
            const deleteBtn = card.querySelector('.delete-col-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.deleteCollectionFromDashboard(col.id);
                });
            }
            
            listContainer.appendChild(card);
        });
    }

    renderCustomerDashboardInquiries();
}

function renderCustomerDashboardInquiries() {
    const listContainer = document.getElementById('seller-inquiries-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        listContainer.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p style="font-size: 0.95rem; margin: 0;">Sign in to view your general contact inquiries.</p>
            </div>
        `;
        return;
    }
    
    const myInquiries = inquiries.filter(i => i.email && i.email.toLowerCase() === currentUser.email.toLowerCase());
    
    if (myInquiries.length === 0) {
        listContainer.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 2.5rem; color: var(--text-secondary); border: 1px dashed var(--border-color);">
                <p style="font-size: 0.95rem; margin: 0; margin-bottom: 1rem;">You haven't submitted any general inquiries yet.</p>
                <button class="btn btn-secondary btn-sm" onclick="switchView('contact')">Send an Inquiry</button>
            </div>
        `;
        return;
    }
    
    myInquiries.forEach(inq => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.padding = '1.5rem';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '1rem';
        
        let borderCol = 'var(--accent-gold)';
        let badgeHTML = '';
        const status = inq.status || 'Pending Response';
        
        if (status === 'Pending Response') {
            borderCol = 'var(--accent-gold)';
            badgeHTML = `<span class="badge" style="font-size: 0.85rem; padding: 4px 10px; background: rgba(223,183,80,0.1); border: 1px solid var(--accent-gold); color: var(--accent-gold); text-transform: uppercase; font-weight: 700; border-radius: 4px; letter-spacing: 0.05em;">Pending Response</span>`;
        } else if (status === 'Waiting for Customer') {
            borderCol = '#3b82f6';
            badgeHTML = `<span class="badge" style="font-size: 0.85rem; padding: 4px 10px; background: rgba(59,130,246,0.1); border: 1px solid #3b82f6; color: #3b82f6; text-transform: uppercase; font-weight: 700; border-radius: 4px; letter-spacing: 0.05em;">Waiting for Response</span>`;
        } else if (status === 'Resolved') {
            borderCol = '#10b981';
            badgeHTML = `<span class="badge" style="font-size: 0.85rem; padding: 4px 10px; background: rgba(16,185,129,0.1); border: 1px solid #10b981; color: #10b981; text-transform: uppercase; font-weight: 700; border-radius: 4px; letter-spacing: 0.05em;">Resolved</span>`;
        }
        
        card.style.borderLeft = `4px solid ${borderCol}`;
        
        let msgs = inq.messages || [];
        if (msgs.length === 0) {
            msgs = [
                { sender: 'customer', text: inq.message, createdAt: inq.createdAt }
            ];
            if (inq.replyText) {
                msgs.push({ sender: 'owner', text: inq.replyText, createdAt: inq.repliedAt });
            }
        }
        
        let originalPhotosHTML = '';
        if (msgs[0].photos && msgs[0].photos.length > 0) {
            originalPhotosHTML = `
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;">
                    ${msgs[0].photos.map(pSrc => `<img src="${pSrc}" style="max-height: 120px; max-width: 120px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open('${pSrc}', '_blank')">`).join('')}
                </div>
            `;
        }

        let repliesHTML = '';
        if (msgs.length > 1) {
            for (let i = 1; i < msgs.length; i++) {
                const m = msgs[i];
                const replyDate = new Date(m.createdAt).toLocaleString();
                
                let msgPhotosHTML = '';
                if (m.photos && m.photos.length > 0) {
                    msgPhotosHTML = `
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;">
                            ${m.photos.map(pSrc => `<img src="${pSrc}" style="max-height: 120px; max-width: 120px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open('${pSrc}', '_blank')">`).join('')}
                        </div>
                    `;
                }

                if (m.sender === 'customer') {
                    repliesHTML += `
                        <div style="background: rgba(223, 183, 80, 0.02); border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; margin-top: 0.5rem;">
                            <p style="color: var(--accent-gold); font-size: 0.9rem; text-transform: uppercase; font-weight: 700; margin: 0 0 0.5rem 0; letter-spacing: 0.05em;">You:</p>
                            <p style="color: var(--text-primary); font-size: 1.05rem; margin: 0; line-height: 1.5; white-space: pre-wrap;">${escapeHTML(m.text)}</p>
                            ${msgPhotosHTML}
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem; margin-bottom: 0;">Sent: ${replyDate}</p>
                        </div>
                    `;
                } else {
                    repliesHTML += `
                        <div style="background: rgba(59, 130, 246, 0.03); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 6px; padding: 1rem; margin-top: 0.5rem;">
                            <p style="color: #3b82f6; font-size: 0.9rem; text-transform: uppercase; font-weight: 700; margin: 0 0 0.5rem 0; letter-spacing: 0.05em;">Lucas (Vault 28 Owner):</p>
                            <p style="color: var(--text-primary); font-size: 1.05rem; margin: 0; line-height: 1.5; white-space: pre-wrap;">${escapeHTML(m.text)}</p>
                            ${msgPhotosHTML}
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem; margin-bottom: 0;">Replied: ${replyDate}</p>
                        </div>
                    `;
                }
            }
        }
        
        let historyToggleHTML = '';
        if (msgs.length > 1) {
            historyToggleHTML = `
                <button class="btn btn-secondary btn-sm" id="customer-btn-toggle-history-${inq.id}" onclick="toggleThreadHistory('${inq.id}', ${msgs.length - 1}, 'customer')" style="align-self: flex-start; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); font-weight: 600; padding: 6px 12px; border-radius: 6px;">Show Thread History (${msgs.length - 1} replies)</button>
            `;
        }
        
        let replyButtonHTML = '';
        if (status === 'Waiting for Customer') {
            replyButtonHTML = `<button class="btn btn-primary btn-sm" onclick="toggleCustomerReplyForm('${inq.id}', true)">Reply to Message</button>`;
        } else if (status === 'Pending Response') {
            replyButtonHTML = `<span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; display: flex; align-items: center; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-gold);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>We have received your message and will respond shortly.</span>`;
        } else if (status === 'Resolved') {
            replyButtonHTML = `<div style="color: var(--accent-emerald); font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>This inquiry has been marked as Resolved.</div>`;
        }
             
        const replyFormHTML = `
            <div id="customer-reply-form-${inq.id}" style="display: none; flex-direction: column; gap: 0.75rem; border-top: 1px dashed var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
                <textarea id="customer-reply-text-${inq.id}" placeholder="Type your reply to Lucas here..." rows="4" style="width: 100%; padding: 0.75rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-family: inherit; font-size: 1.05rem; line-height: 1.5; resize: vertical;"></textarea>
                
                <!-- Reply Photos Upload -->
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <label style="font-size: 1rem; font-weight: 600; color: var(--text-secondary);">Attach Photos (Optional)</label>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('customer-reply-file-input-${inq.id}').click()" style="padding: 6px 12px; font-size: 0.9rem;">
                            📎 Add Photos
                        </button>
                        <input type="file" id="customer-reply-file-input-${inq.id}" accept="image/*" multiple style="display: none;" onchange="handleReplyPhotosChange(this, '${inq.id}')">
                        <span id="customer-reply-photo-count-${inq.id}" style="font-size: 0.85rem; color: var(--text-muted);">No files selected</span>
                    </div>
                    <div id="customer-reply-preview-${inq.id}" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 0.5rem; margin-top: 0.25rem;"></div>
                </div>

                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <button class="btn btn-primary btn-sm" onclick="sendCustomerDashboardReply('${inq.id}')">Send Reply</button>
                    <button class="btn btn-secondary btn-sm" onclick="toggleCustomerReplyForm('${inq.id}', false)">Cancel</button>
                </div>
            </div>
        `;
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    <h4 style="margin: 0; font-size: 1.25rem; color: var(--text-primary); font-family: var(--font-title); text-transform: uppercase;">${escapeHTML(inq.subject)}</h4>
                    <p style="margin: 4px 0 0 0; font-size: 0.95rem; color: var(--text-muted);">Inquiry ID: ${inq.id}</p>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <span style="font-size: 0.9rem; color: var(--text-muted);">${new Date(inq.createdAt).toLocaleString()}</span>
                    <div>${badgeHTML}</div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 6px; padding: 1.25rem; color: var(--text-secondary); font-size: 1.05rem; line-height: 1.5; white-space: pre-wrap;">
                <span style="color: var(--accent-gold); font-size: 0.9rem; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.25rem; letter-spacing: 0.05em;">Original Message:</span>
                ${escapeHTML(msgs[0].text)}
                ${originalPhotosHTML}
            </div>
            
            ${historyToggleHTML}
            
            <!-- Collapsible Replies Container -->
            <div id="customer-thread-history-${inq.id}" style="display: none; flex-direction: column; gap: 0.75rem;">
                ${repliesHTML}
            </div>
            
            <!-- Customer Dashboard Inquiry Controls -->
            <div id="customer-controls-${inq.id}" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
                ${replyButtonHTML}
            </div>
            
            ${replyFormHTML}
        `;
        listContainer.appendChild(card);
    });
}

window.toggleCustomerReplyForm = function(inqId, show) {
    const form = document.getElementById(`customer-reply-form-${inqId}`);
    const controls = document.getElementById(`customer-controls-${inqId}`);
    if (form) form.style.display = show ? 'flex' : 'none';
    if (controls) controls.style.display = show ? 'none' : 'flex';
};

window.toggleThreadHistory = function(inqId, totalReplies, prefix = 'admin') {
    const historyDiv = document.getElementById(`${prefix}-thread-history-${inqId}`);
    const btn = document.getElementById(`${prefix}-btn-toggle-history-${inqId}`);
    if (!historyDiv || !btn) return;
    
    if (historyDiv.style.display === 'none') {
        historyDiv.style.display = 'flex';
        btn.textContent = 'Hide Thread History';
    } else {
        historyDiv.style.display = 'none';
        btn.textContent = `Show Thread History (${totalReplies} replies)`;
    }
};

window.customerReplyPhotos = window.customerReplyPhotos || {};

window.handleReplyPhotosChange = function(input, inqId) {
    const previewDiv = document.getElementById(`customer-reply-preview-${inqId}`);
    const countSpan = document.getElementById(`customer-reply-photo-count-${inqId}`);
    if (!previewDiv || !countSpan) return;
    
    window.customerReplyPhotos[inqId] = [];
    previewDiv.innerHTML = '';
    
    if (input.files.length === 0) {
        countSpan.textContent = 'No files selected';
        return;
    }
    
    countSpan.textContent = `${input.files.length} file(s) selected`;
    
    Array.from(input.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            window.customerReplyPhotos[inqId].push(base64);
            
            const thumb = document.createElement('div');
            thumb.className = 'uploaded-preview-item';
            thumb.style.position = 'relative';
            thumb.style.width = '70px';
            thumb.style.height = '70px';
            thumb.innerHTML = `
                <img src="${base64}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);" />
            `;
            previewDiv.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });
};

window.sendCustomerDashboardReply = function(inqId) {
    const replyText = document.getElementById(`customer-reply-text-${inqId}`).value.trim();
    if (!replyText) {
        showToast("Please enter a reply message.", "error");
        return;
    }
    
    const photos = window.customerReplyPhotos[inqId] || [];
    
    if (isFirebaseActive) {
        db.collection("inquiries").doc(inqId).get()
            .then(doc => {
                if (!doc.exists) throw new Error("Inquiry not found");
                const inq = doc.data();
                const msgs = inq.messages || [{ sender: 'customer', text: inq.message, createdAt: inq.createdAt }];
                
                msgs.push({
                    sender: 'customer',
                    text: replyText,
                    createdAt: new Date().toISOString(),
                    photos: photos
                });
                
                return db.collection("inquiries").doc(inqId).update({
                    messages: msgs,
                    status: 'Pending Response'
                }).then(() => {
                    delete window.customerReplyPhotos[inqId];
                    
                    let replyPhotosEmailHtml = '';
                    if (photos && photos.length > 0) {
                        replyPhotosEmailHtml = `
                            <p style="color: #dfb750; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; margin: 20px 0 10px 0;">Attached Photos</p>
                            <div style="background-color: #0c0f19; border: 1px solid #1f293d; border-radius: 8px; padding: 15px; color: #cbd5e1; font-size: 14px;">
                                ${photos.map((src, index) => `<img src="${src}" alt="Reply Attachment ${index + 1}" style="max-width: 100%; border-radius: 6px; border: 1px solid #1f293d; margin-bottom: 10px; display: block;" />`).join('')}
                            </div>
                        `;
                    }
                    const ownerNotificationMail = {
                        to: 'lshaver@vault28cards.com',
                        replyTo: inq.email,
                        message: {
                            subject: `Customer Replied: ${inq.subject}`,
                            html: generateStandardEmailHtml(
                                `Customer Replied`,
                                `
                                <p>The customer <strong>${inq.name}</strong> (${inq.email}) has replied to their inquiry:</p>
                                <div style="background-color: #0c0f19; border-left: 4px solid #dfb750; padding: 15px; border-radius: 6px; margin: 20px 0; color: #ffffff; white-space: pre-wrap;">${replyText}</div>
                                ${replyPhotosEmailHtml}
                                `,
                                `<a href="${window.location.origin}/?adminTab=inquiries" style="display: inline-block; background: linear-gradient(135deg, #f5d075 0%, #dfb750 100%); color: #0c0f19; font-weight: 700; font-size: 13px; padding: 12px 28px; text-decoration: none; border-radius: 25px; box-shadow: 0 4px 12px rgba(223, 183, 80, 0.25); text-transform: uppercase; letter-spacing: 0.08em;">Open Owner Console</a>`
                            )
                        }
                    };
                    return db.collection("mail").add(ownerNotificationMail);
                });
            })
            .then(() => {
                showToast("Reply sent!", "success");
            })
            .catch(err => {
                console.error("Error submitting customer reply:", err);
                showToast("Could not send reply.", "error");
            });
    } else {
        const inq = inquiries.find(i => i.id === inqId);
        if (inq) {
            if (!inq.messages) {
                inq.messages = [{ sender: 'customer', text: inq.message, createdAt: inq.createdAt }];
            }
            inq.messages.push({
                sender: 'customer',
                text: replyText,
                createdAt: new Date().toISOString()
            });
            inq.status = 'Pending Response';
            localStorage.setItem('v28_inquiries', JSON.stringify(inquiries));
            showToast("Reply simulated in sandbox!", "success");
            renderCustomerDashboardInquiries();
        }
    }
};

function renderSellerDetail(id) {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    
    document.getElementById('seller-detail-title').textContent = col.title;
    document.getElementById('seller-detail-desc').textContent = col.description;
    
    const badge = document.getElementById('seller-detail-status');
    badge.textContent = col.status;
    badge.className = 'badge';
    if (col.status === 'New') badge.classList.add('badge-pending');
    if (col.status === 'Reviewing' || col.status === 'Negotiating') badge.classList.add('badge-negotiating');
    if (col.status === 'Offer Made') badge.classList.add('badge-offer');
    if (col.status === 'Bought' || col.status === 'Purchased' || col.status === 'Accepted') badge.classList.add('badge-bought');
    if (col.status === 'Declined') badge.classList.add('badge-declined');
    
    const headerPrice = document.getElementById('seller-chat-header-price');
    headerPrice.textContent = `$${(col.offerPrice > 0 ? col.offerPrice : col.askingPrice).toLocaleString()}`;
    
    const statusBox = document.getElementById('seller-status-alert-box');
    const chatActionBox = document.getElementById('seller-chat-action-box');
    statusBox.innerHTML = '';
    chatActionBox.innerHTML = '';
    chatActionBox.style.display = 'none';
    
    if (col.status === 'Offer Made') {
        statusBox.innerHTML = `
            <div class="glass-card" style="padding: 1rem; border-color: var(--accent-cyan); background: rgba(223,183,80,0.05);">
                🔥 <strong>Offer Received:</strong> Vault 28 offered <strong>$${col.offerPrice.toLocaleString()}</strong> for this collection.
            </div>
        `;
        
        chatActionBox.style.display = 'block';
        chatActionBox.innerHTML = `
            <div class="chat-offer-card" style="background:rgba(223,183,80,0.05); border:1px solid var(--accent-cyan); border-radius:8px; padding:1rem; margin-bottom:1rem;">
                <div style="font-weight:600; font-family:var(--font-title); margin-bottom:0.25rem;">VALUATION COUNTER OFFER</div>
                <div style="font-size:1.75rem; font-weight:700; color:var(--accent-cyan); margin-bottom:0.5rem;">$${col.offerPrice.toLocaleString()}</div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-primary btn-sm" style="flex:1;" onclick="sellerAcceptOffer('${col.id}')">Accept Offer</button>
                    <button class="btn btn-secondary btn-sm" style="flex:1; color:var(--accent-red);" onclick="sellerDeclineOffer('${col.id}')">Decline / Counter</button>
                </div>
            </div>
        `;
    } else if (col.status === 'Bought' || col.status === 'Purchased' || col.status === 'Accepted') {
        statusBox.innerHTML = `
            <div class="glass-card" style="padding: 1rem; border-color: var(--accent-emerald); background: rgba(13,243,163,0.05);">
                🎉 <strong>Deal Closed!</strong> Purchased for <strong>$${col.offerPrice.toLocaleString()}</strong>.
            </div>
        `;
    }
    
    // Render Slabs
    const slabContainer = document.getElementById('seller-detail-slab-visuals');
    slabContainer.innerHTML = '';
    if (!col.cards || col.cards.length === 0) {
        slabContainer.innerHTML = `
            <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1.5rem; color: var(--text-secondary); border: 1px dashed rgba(255, 255, 255, 0.12); width: 100%;">
                <p style="margin: 0; font-size: 0.95rem; font-weight: 500;">No Cataloged Highlights</p>
                <p style="margin: 6px 0 0 0; font-size: 0.8rem; color: var(--text-muted);">No individual highlight card photos or grades were added for this lot.</p>
            </div>
        `;
    } else {
        col.cards.forEach(card => {
            const gradeNum = card.grade.match(/\d+/) ? card.grade.match(/\d+/)[0] : '9';
            const gradeText = card.grade.split(' ').slice(1).join(' ').toUpperCase() || 'MINT';
            
            const slab = document.createElement('div');
            slab.className = 'card-slab';
            slab.innerHTML = `
                <div class="slab-label">
                    <div class="slab-label-brand">VAULT 28 GRADING</div>
                    <div class="slab-label-info">
                        <span class="card-player">${card.player}</span>
                        <span>${card.year} ${card.brand}</span>
                    </div>
                    <div class="slab-label-grade-box">
                        <div class="slab-label-grade-num">${gradeNum}</div>
                        <div class="slab-label-grade-text">${gradeText}</div>
                    </div>
                </div>
                <div class="slab-image-container"><img class="slab-image" src="${card.image}"></div>
                <div class="slab-footer">${card.player}</div>
            `;
            slabContainer.appendChild(slab);
        });
    }
    
    // Render General Images
    const generalPhotosContainer = document.getElementById('seller-detail-general-photos');
    const photosTitle = document.getElementById('seller-detail-photos-title');
    if (generalPhotosContainer && photosTitle) {
        generalPhotosContainer.innerHTML = '';
        if (col.generalImages && col.generalImages.length > 0) {
            photosTitle.style.display = 'block';
            generalPhotosContainer.style.display = 'grid';
            col.generalImages.forEach(img => {
                const imgEl = document.createElement('div');
                imgEl.style.position = 'relative';
                imgEl.style.borderRadius = '8px';
                imgEl.style.overflow = 'hidden';
                imgEl.style.border = '1px solid var(--border-color)';
                imgEl.style.aspectRatio = '1 / 1';
                imgEl.innerHTML = `
                    <img src="${img.base64}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: transform 0.2s;" onclick="window.open('${img.base64}', '_blank')" />
                `;
                generalPhotosContainer.appendChild(imgEl);
            });
        } else {
            photosTitle.style.display = 'none';
            generalPhotosContainer.style.display = 'none';
        }
    }
    
    // Table Details
    const listContainer = document.getElementById('seller-detail-cards-list');
    listContainer.innerHTML = '';
    if (!col.cards || col.cards.length === 0) {
        listContainer.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 1.5rem; color: var(--text-secondary); border: 1px dashed rgba(255, 255, 255, 0.12); width: 100%;">
                <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">No cataloged item details available.</p>
            </div>
        `;
    } else {
        col.cards.forEach(c => {
            const row = document.createElement('div');
            row.className = 'card-item-row';
            row.innerHTML = `
                <img class="card-item-img" src="${c.image}">
                <div class="card-item-details">
                    <div class="card-item-name">${c.player}</div>
                    <div class="card-item-meta">${c.year} ${c.brand}</div>
                </div>
                <div class="price-val" style="font-size:0.9rem;">${c.grade}</div>
            `;
            listContainer.appendChild(row);
        });
    }

    renderChatMessages('seller-chat-messages', col.messages, 'seller');
}

// Chat rendering helper
function renderChatMessages(elementId, msgs, perspective) {
    const box = document.getElementById(elementId);
    box.innerHTML = '';
    msgs.forEach(m => {
        const div = document.createElement('div');
        div.className = `chat-bubble-wrapper ${m.sender === perspective ? 'sent' : m.sender === 'system' ? 'system' : 'received'}`;
        
        if (m.sender === 'system') {
            div.innerHTML = `<div class="chat-bubble-system">⚙️ ${m.text}</div>`;
        } else {
            div.innerHTML = `
                <div class="chat-bubble-sender">${m.senderName}</div>
                <div class="chat-bubble">${m.text}</div>
            `;
        }
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

// Seller chat submission
document.getElementById('seller-chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('seller-chat-input');
    const text = input.value.trim();
    if (!text || !selectedCollectionId) return;
    
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const user = isFirebaseActive ? firebase.auth().currentUser : null;
    const name = user ? (user.displayName || user.email.split('@')[0]) : col.sellerName;
    
    const newMsg = {
        sender: 'seller',
        senderName: name,
        text,
        timestamp: new Date().toISOString()
    };
    
    const nextStatus = col.status === 'Offer Made' ? 'Negotiating' : col.status;
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: nextStatus,
            messages: firebase.firestore.FieldValue.arrayUnion(newMsg)
        }).then(() => input.value = '');
    } else {
        col.messages.push(newMsg);
        col.status = nextStatus;
        saveLocalCollections();
        input.value = '';
        renderSellerDetail(selectedCollectionId);
        showToast("Message sent to local sandbox!", "success");
    }
});

// ChatSuggestion Chips binding
document.getElementById('seller-chat-suggestions').addEventListener('click', (e) => {
    if (e.target.classList.contains('chat-suggestion-chip')) {
        document.getElementById('seller-chat-input').value = e.target.textContent;
        document.getElementById('seller-chat-input').focus();
    }
});

window.sellerAcceptOffer = function(id) {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    
    const msg1 = { sender: 'system', senderName: 'System', text: 'Offer accepted! Deal is closed.', timestamp: new Date().toISOString() };
    const msg2 = { sender: 'buyer', senderName: 'V28 Buying Desk', text: `We purchased this collection for $${col.offerPrice.toLocaleString()}. Please pack the items securely and ship them to: Vault 28 Headquarters, 100 Collector Way, Suite A, New York, NY 10001, or contact us to coordinate pickup.`, timestamp: new Date().toISOString() };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(id).update({
            status: 'Accepted',
            messages: firebase.firestore.FieldValue.arrayUnion(msg1, msg2)
        });
    } else {
        col.status = 'Accepted';
        col.messages.push(msg1, msg2);
        saveLocalCollections();
        triggerUIRefresh();
        showToast("Offer accepted!", "success");
    }
};

window.sellerDeclineOffer = function(id) {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    
    const msg = { sender: 'system', senderName: 'System', text: 'Seller declined the offer and opened negotiations.', timestamp: new Date().toISOString() };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(id).update({
            status: 'Negotiating',
            messages: firebase.firestore.FieldValue.arrayUnion(msg)
        });
    } else {
        col.status = 'Negotiating';
        col.messages.push(msg);
        saveLocalCollections();
        triggerUIRefresh();
        showToast("Offer declined. Chat is open.");
    }
};


// ==================== ADMIN console / dashboard ====================

// Admin tab switcher
function setAdminTab(tabName) {
    activeAdminTab = tabName;
    const btnSub = document.getElementById('tab-btn-submissions');
    const btnInv = document.getElementById('tab-btn-inventory');
    const btnCon = document.getElementById('tab-btn-content');
    const btnUsr = document.getElementById('tab-btn-users');
    const btnInq = document.getElementById('tab-btn-inquiries');
    
    const panelSub = document.getElementById('panel-submissions');
    const panelInv = document.getElementById('panel-inventory');
    const panelCon = document.getElementById('panel-content');
    const panelUsr = document.getElementById('panel-users');
    const panelInq = document.getElementById('panel-inquiries');
    
    [btnSub, btnInv, btnCon, btnUsr, btnInq].forEach(btn => btn && btn.classList.remove('active'));
    [panelSub, panelInv, panelCon, panelUsr, panelInq].forEach(panel => panel && panel.classList.remove('active'));
    
    if (tabName === 'submissions') {
        btnSub.classList.add('active');
        panelSub.classList.add('active');
    } else if (tabName === 'inventory') {
        btnInv.classList.add('active');
        panelInv.classList.add('active');
        renderAdminInventoryTable();
    } else if (tabName === 'content') {
        btnCon.classList.add('active');
        panelCon.classList.add('active');
        renderAdminReviewsList();
    } else if (tabName === 'users') {
        if (btnUsr) btnUsr.classList.add('active');
        if (panelUsr) panelUsr.classList.add('active');
        renderAdminUsersTable();
    } else if (tabName === 'inquiries') {
        if (btnInq) btnInq.classList.add('active');
        if (panelInq) panelInq.classList.add('active');
        renderAdminInquiriesList();
    }
}

document.getElementById('tab-btn-submissions').addEventListener('click', () => setAdminTab('submissions'));
document.getElementById('tab-btn-inventory').addEventListener('click', () => setAdminTab('inventory'));
document.getElementById('tab-btn-content').addEventListener('click', () => setAdminTab('content'));
document.getElementById('tab-btn-users').addEventListener('click', () => setAdminTab('users'));
if (document.getElementById('tab-btn-inquiries')) {
    document.getElementById('tab-btn-inquiries').addEventListener('click', () => setAdminTab('inquiries'));
}

// HTML Escaper Helper
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// User Session Presence Presence Management
function recordUserActivity(uid, email, displayName, isRegistering = false) {
    const timestamp = new Date().toISOString();
    
    if (isFirebaseActive) {
        const userDocRef = db.collection("users").doc(uid);
        const data = {
            uid: uid,
            email: email,
            displayName: displayName || email.split('@')[0],
            lastSeenAt: timestamp,
            isOnline: true
        };
        if (isRegistering) {
            data.registeredAt = timestamp;
        }
        userDocRef.set(data, { merge: true }).catch(err => console.error("Error recording user activity:", err));
    } else {
        // Local Sandbox Mode
        let localUsers = [];
        const stored = localStorage.getItem('v28_users');
        if (stored) localUsers = JSON.parse(stored);
        else localUsers = [...DEFAULT_USERS];
        
        let existingUser = localUsers.find(u => u.uid === uid);
        if (existingUser) {
            existingUser.lastSeenAt = timestamp;
            existingUser.isOnline = true;
            if (displayName) existingUser.displayName = displayName;
        } else {
            existingUser = {
                uid: uid,
                email: email,
                displayName: displayName || email.split('@')[0],
                registeredAt: timestamp,
                lastSeenAt: timestamp,
                isOnline: true
            };
            localUsers.push(existingUser);
        }
        
        localStorage.setItem('v28_users', JSON.stringify(localUsers));
        users = localUsers;
        renderAdminUsersTable();
    }
}

function setUserOffline(uid) {
    if (!uid) return;
    if (isFirebaseActive) {
        db.collection("users").doc(uid).update({
            isOnline: false,
            lastSeenAt: new Date().toISOString()
        }).catch(err => console.error(err));
    } else {
        let localUsers = [];
        const stored = localStorage.getItem('v28_users');
        if (stored) localUsers = JSON.parse(stored);
        else localUsers = [...DEFAULT_USERS];
        
        const u = localUsers.find(u => u.uid === uid);
        if (u) {
            u.isOnline = false;
            u.lastSeenAt = new Date().toISOString();
        }
        localStorage.setItem('v28_users', JSON.stringify(localUsers));
        users = localUsers;
        renderAdminUsersTable();
    }
}

// Render Admin registered users table
function renderAdminUsersTable() {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Update stats
    const totalUsers = users.length;
    const onlineUsers = users.filter(u => u.isOnline).length;
    
    const statTotal = document.getElementById('admin-stat-users-total');
    const statOnline = document.getElementById('admin-stat-users-online');
    const badgeUsers = document.getElementById('admin-badge-users');
    
    if (statTotal) statTotal.textContent = totalUsers;
    if (statOnline) statOnline.textContent = onlineUsers;
    if (badgeUsers) badgeUsers.textContent = totalUsers;
    
    if (totalUsers === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">👥</div>
                    No registered user accounts found.
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const regDate = user.registeredAt ? new Date(user.registeredAt).toLocaleString() : 'N/A';
        const lastSeen = user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : 'N/A';
        
        const statusBadge = user.isOnline 
            ? `<span class="badge badge-success" style="box-shadow: 0 0 8px rgba(16,185,129,0.3); font-weight:600;"><span class="pulse-dot" style="display:inline-block; width: 6px; height: 6px; background:#fff; border-radius:50%; margin-right:5px; vertical-align:middle; animation: adminPulse 1.5s infinite alternate;"></span>Online</span>` 
            : `<span class="badge badge-muted" style="color: var(--text-muted); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">Offline</span>`;
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--text-primary);">${escapeHTML(user.displayName || 'No Name')}</td>
            <td style="font-family: monospace; font-size: 0.85rem; color: var(--accent-cyan);">${escapeHTML(user.email)}</td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">${regDate}</td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">${lastSeen}</td>
            <td>${statusBadge}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Window Unload Presence Updater
window.addEventListener('beforeunload', () => {
    if (isFirebaseActive) {
        const user = firebase.auth().currentUser;
        if (user) {
            db.collection("users").doc(user.uid).update({ isOnline: false });
        }
    } else {
        setUserOffline('sandbox-user');
    }
});

// Render Admin submissions list
function renderBuyerDashboard() {
    const tableBody = document.getElementById('buyer-submissions-list-rows');
    tableBody.innerHTML = '';
    
    // Stats calculations
    document.getElementById('stat-total-submissions').textContent = collections.length;
    document.getElementById('stat-pending-valuations').textContent = collections.filter(c => c.status === 'New' || c.status === 'Reviewing').length;
    document.getElementById('stat-active-negotiations').textContent = collections.filter(c => c.status === 'Offer Made' || c.status === 'Negotiating').length;
    document.getElementById('stat-deals-closed').textContent = collections.filter(c => c.status === 'Accepted' || c.status === 'Purchased' || c.status === 'Bought').length;
    
    if (collections.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:3rem; color:var(--text-muted);">No submissions received yet.</td></tr>`;
        return;
    }
    
    collections.forEach(col => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-color)';
        row.className = 'table-row-hover';
        
        let badgeClass = 'badge-pending';
        if (col.status === 'Reviewing' || col.status === 'Negotiating') badgeClass = 'badge-negotiating';
        if (col.status === 'Offer Made') badgeClass = 'badge-offer';
        if (col.status === 'Bought' || col.status === 'Purchased' || col.status === 'Accepted') badgeClass = 'badge-bought';
        if (col.status === 'Declined') badgeClass = 'badge-declined';
        
        row.innerHTML = `
            <td style="padding: 1rem 0.5rem; font-weight:600;">${col.title}</td>
            <td style="padding: 1rem 0.5rem;">${col.sellerName}</td>
            <td style="padding: 1rem 0.5rem;">${col.sport}</td>
            <td style="padding: 1rem 0.5rem;">${col.qty}</td>
            <td style="padding: 1rem 0.5rem;">$${col.askingPrice.toLocaleString()}</td>
            <td style="padding: 1rem 0.5rem; font-weight: 700; color:var(--accent-cyan);">$${(col.offerPrice || 0).toLocaleString()}</td>
            <td style="padding: 1rem 0.5rem;"><span class="badge ${badgeClass}">${col.status}</span></td>
            <td style="padding: 1rem 0.5rem; text-align:right;">
                <button class="btn btn-outline-cyan btn-sm" onclick="openAdminReview('${col.id}')">Inspect & Value</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

window.openAdminReview = function(id) {
    selectedCollectionId = id;
    switchView('buyer-detail');
};

function renderBuyerDetail(id) {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    
    document.getElementById('buyer-detail-title').textContent = col.title;
    document.getElementById('buyer-detail-seller-name').textContent = `${col.sellerName} (${col.sellerEmail} | ${col.sellerPhone})`;
    document.getElementById('buyer-detail-card-count').textContent = `${col.qty} items`;
    
    const badge = document.getElementById('buyer-detail-status');
    badge.textContent = col.status;
    badge.className = 'badge';
    if (col.status === 'New') badge.classList.add('badge-pending');
    if (col.status === 'Reviewing' || col.status === 'Negotiating') badge.classList.add('badge-negotiating');
    if (col.status === 'Offer Made') badge.classList.add('badge-offer');
    if (col.status === 'Bought' || col.status === 'Purchased' || col.status === 'Accepted') badge.classList.add('badge-bought');
    if (col.status === 'Declined') badge.classList.add('badge-declined');
    
    document.getElementById('buyer-val-asking').value = `$${col.askingPrice.toLocaleString()}`;
    document.getElementById('buyer-val-offer').value = col.offerPrice > 0 ? col.offerPrice : Math.floor(col.askingPrice * 0.85);
    document.getElementById('buyer-set-status-select').value = col.status;
    
    const headerPrice = document.getElementById('buyer-chat-header-price');
    headerPrice.textContent = `$${col.askingPrice.toLocaleString()}`;
    
    const chatAvatar = document.getElementById('buyer-chat-avatar');
    chatAvatar.textContent = col.sellerName.charAt(0);
    document.getElementById('buyer-chat-seller-title').textContent = col.sellerName;
    
    // Status specific alerts
    const statusBox = document.getElementById('buyer-status-alert-box');
    statusBox.innerHTML = '';
    if (col.status === 'Offer Made') {
        statusBox.innerHTML = `<div class="glass-card" style="padding:0.75rem 1rem; border-color:var(--accent-cyan); background:rgba(223,183,80,0.05);">⏳ Active offer of <strong>$${col.offerPrice.toLocaleString()}</strong> sent. Awaiting seller.</div>`;
    }
    
    // Slabs
    const slabContainer = document.getElementById('buyer-detail-slab-visuals');
    slabContainer.innerHTML = '';
    if (!col.cards || col.cards.length === 0) {
        slabContainer.innerHTML = `
            <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1.5rem; color: var(--text-secondary); border: 1px dashed rgba(255, 255, 255, 0.12); width: 100%;">
                <p style="margin: 0; font-size: 0.95rem; font-weight: 500;">No Cataloged Highlights</p>
                <p style="margin: 6px 0 0 0; font-size: 0.8rem; color: var(--text-muted);">No individual highlight card photos or grades were added for this lot.</p>
            </div>
        `;
    } else {
        col.cards.forEach(card => {
            const gradeNum = card.grade.match(/\d+/) ? card.grade.match(/\d+/)[0] : '9';
            const gradeText = card.grade.split(' ').slice(1).join(' ').toUpperCase() || 'MINT';
            
            const slab = document.createElement('div');
            slab.className = 'card-slab';
            slab.innerHTML = `
                <div class="slab-label">
                    <div class="slab-label-brand">VAULT 28 GRADING</div>
                    <div class="slab-label-info">
                        <span class="card-player">${card.player}</span>
                        <span>${card.year} ${card.brand}</span>
                    </div>
                    <div class="slab-label-grade-box">
                        <div class="slab-label-grade-num">${gradeNum}</div>
                        <div class="slab-label-grade-text">${gradeText}</div>
                    </div>
                </div>
                <div class="slab-image-container"><img class="slab-image" src="${card.image}"></div>
                <div class="slab-footer">${card.player}</div>
            `;
            slabContainer.appendChild(slab);
        });
    }
    
    // Render General Images for Admin Inspection
    const generalPhotosContainer = document.getElementById('buyer-detail-general-photos');
    const photosTitle = document.getElementById('buyer-detail-photos-title');
    if (generalPhotosContainer && photosTitle) {
        generalPhotosContainer.innerHTML = '';
        if (col.generalImages && col.generalImages.length > 0) {
            photosTitle.style.display = 'block';
            generalPhotosContainer.style.display = 'grid';
            col.generalImages.forEach(img => {
                const imgEl = document.createElement('div');
                imgEl.style.position = 'relative';
                imgEl.style.borderRadius = '8px';
                imgEl.style.overflow = 'hidden';
                imgEl.style.border = '1px solid var(--border-color)';
                imgEl.style.aspectRatio = '1 / 1';
                imgEl.innerHTML = `
                    <img src="${img.base64}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: transform 0.2s;" onclick="window.open('${img.base64}', '_blank')" />
                `;
                generalPhotosContainer.appendChild(imgEl);
            });
        } else {
            photosTitle.style.display = 'none';
            generalPhotosContainer.style.display = 'none';
        }
    }
    
    // Table Details
    const listContainer = document.getElementById('buyer-detail-cards-list');
    listContainer.innerHTML = '';
    if (!col.cards || col.cards.length === 0) {
        listContainer.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 1.5rem; color: var(--text-secondary); border: 1px dashed rgba(255, 255, 255, 0.12); width: 100%;">
                <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">No cataloged item details available.</p>
            </div>
        `;
    } else {
        col.cards.forEach(c => {
            const row = document.createElement('div');
            row.className = 'card-item-row';
            row.innerHTML = `
                <img class="card-item-img" src="${c.image}">
                <div class="card-item-details">
                    <div class="card-item-name">${c.player}</div>
                    <div class="card-item-meta">${c.year} ${c.brand}</div>
                </div>
                <div class="price-val" style="font-size:0.9rem;">${c.grade}</div>
            `;
            listContainer.appendChild(row);
        });
    }

    renderChatMessages('buyer-chat-messages', col.messages, 'buyer');
}

// Buyer actions: send offers
document.getElementById('btn-buyer-send-offer').addEventListener('click', () => {
    const offerVal = parseFloat(document.getElementById('buyer-val-offer').value);
    const note = document.getElementById('buyer-offer-note').value.trim();
    if (!offerVal || !selectedCollectionId) return;
    
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const msg1 = { sender: 'system', senderName: 'System', text: `Vault 28 Buying Desk made a counter offer of $${offerVal.toLocaleString()}.`, timestamp: new Date().toISOString() };
    const msg2 = { sender: 'buyer', senderName: 'V28 Buying Desk', text: note ? `Offer notes: ${note}` : `Based on market research, we can make you a counter offer of $${offerVal.toLocaleString()}. Let us know if you accept!`, timestamp: new Date().toISOString() };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: 'Offer Made',
            offerPrice: offerVal,
            messages: firebase.firestore.FieldValue.arrayUnion(msg1, msg2)
        });
    } else {
        col.status = 'Offer Made';
        col.offerPrice = offerVal;
        col.messages.push(msg1, msg2);
        saveLocalCollections();
        triggerUIRefresh();
        showToast("Offer counter sent successfully!", "success");
    }
});

// Admin chat suggestions
document.getElementById('buyer-chat-suggestions').addEventListener('click', (e) => {
    if (e.target.classList.contains('chat-suggestion-chip')) {
        document.getElementById('buyer-chat-input').value = e.target.textContent;
        document.getElementById('buyer-chat-input').focus();
    }
});

// Buyer chat submission
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
        text,
        timestamp: new Date().toISOString()
    };
    
    const nextStatus = col.status === 'New' ? 'Reviewing' : col.status;
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: nextStatus,
            messages: firebase.firestore.FieldValue.arrayUnion(newMsg)
        }).then(() => input.value = '');
    } else {
        col.messages.push(newMsg);
        col.status = nextStatus;
        saveLocalCollections();
        input.value = '';
        renderBuyerDetail(selectedCollectionId);
        showToast("Message sent to local sandbox!", "success");
    }
});

// Buyer buy at asking
document.getElementById('btn-buyer-buy-asking').addEventListener('click', () => {
    if (!selectedCollectionId) return;
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const msg1 = { sender: 'system', senderName: 'System', text: `Vault 28 accepted asking price of $${col.askingPrice.toLocaleString()}!`, timestamp: new Date().toISOString() };
    const msg2 = { sender: 'buyer', senderName: 'V28 Buying Desk', text: `We accept your asking price of $${col.askingPrice.toLocaleString()}! Please pack the items securely and ship to our headquarters. Payout will be issued immediately upon arrival and checklist inspection.`, timestamp: new Date().toISOString() };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: 'Accepted',
            offerPrice: col.askingPrice,
            messages: firebase.firestore.FieldValue.arrayUnion(msg1, msg2)
        });
    } else {
        col.status = 'Accepted';
        col.offerPrice = col.askingPrice;
        col.messages.push(msg1, msg2);
        saveLocalCollections();
        triggerUIRefresh();
        showToast("Purchased collection at asking!", "success");
    }
});

// Buyer decline
document.getElementById('btn-buyer-decline').addEventListener('click', () => {
    if (!selectedCollectionId) return;
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const msg1 = { sender: 'system', senderName: 'System', text: 'Vault 28 has declined this submission.', timestamp: new Date().toISOString() };
    const msg2 = { sender: 'buyer', senderName: 'V28 Buying Desk', text: 'Thank you for submitting your collectibles. Unfortunately, we are not purchasing these specific items at this time. Best of luck with your cards!', timestamp: new Date().toISOString() };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: 'Declined',
            messages: firebase.firestore.FieldValue.arrayUnion(msg1, msg2)
        });
    } else {
        col.status = 'Declined';
        col.messages.push(msg1, msg2);
        saveLocalCollections();
        triggerUIRefresh();
        showToast("Submission declined.");
    }
});

// Manual status override selector
document.getElementById('buyer-set-status-select').addEventListener('change', (e) => {
    const nextStatus = e.target.value;
    if (!selectedCollectionId) return;
    
    const col = collections.find(c => c.id === selectedCollectionId);
    if (!col) return;
    
    const msg = { sender: 'system', senderName: 'System', text: `Admin overridden status label to: ${nextStatus}`, timestamp: new Date().toISOString() };
    
    if (isFirebaseActive) {
        db.collection("collections").doc(selectedCollectionId).update({
            status: nextStatus,
            messages: firebase.firestore.FieldValue.arrayUnion(msg)
        });
    } else {
        col.status = nextStatus;
        col.messages.push(msg);
        saveLocalCollections();
        triggerUIRefresh();
        showToast(`Status updated to: ${nextStatus}`);
    }
});


// ==================== ADMIN SHOP INVENTORY MANAGEMENT ====================

// Add product image uploader bindings
const prodDropzone = document.getElementById('admin-prod-dropzone');
const prodFileInput = document.getElementById('admin-prod-file-input');
const prodPreview = document.getElementById('admin-prod-image-preview');
let uploadedProductImageBase64 = null;

prodDropzone.addEventListener('click', () => prodFileInput.click());
prodFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (el) => {
            uploadedProductImageBase64 = el.target.result;
            prodPreview.innerHTML = `
                <div class="uploaded-preview-item" style="width: 120px; height: 120px;">
                    <img src="${uploadedProductImageBase64}">
                    <button type="button" class="uploaded-preview-remove" id="btn-remove-prod-img">×</button>
                </div>
            `;
            document.getElementById('btn-remove-prod-img').addEventListener('click', () => {
                uploadedProductImageBase64 = null;
                prodPreview.innerHTML = '';
            });
        };
        reader.readAsDataURL(file);
    }
});

// Add / Edit Product Submit
document.getElementById('admin-product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('admin-prod-id').value;
    const title = document.getElementById('admin-prod-title').value.trim();
    const price = parseFloat(document.getElementById('admin-prod-price').value);
    const condition = document.getElementById('admin-prod-condition').value.trim();
    const category = document.getElementById('admin-prod-category').value;
    const availability = document.getElementById('admin-prod-availability').value;
    const desc = document.getElementById('admin-prod-desc').value.trim();
    const shipping = document.getElementById('admin-prod-shipping').value.trim();
    
    const fallbackImage = generateCardMockupImage(title, 2026, category, category);
    const image = uploadedProductImageBase64 || fallbackImage;
    
    const prodId = id || 'prod-' + Math.random().toString(36).substr(2, 9);
    const newProd = {
        id: prodId,
        title,
        price,
        condition,
        category,
        availability,
        description: desc,
        shipping,
        image,
        createdAt: new Date().toISOString()
    };
    
    if (isFirebaseActive) {
        db.collection("products").doc(prodId).set(newProd)
            .then(() => {
                showToast("Product listing saved successfully!", "success");
                resetAdminProductForm();
            });
    } else {
        const existingIdx = products.findIndex(p => p.id === prodId);
        if (existingIdx > -1) {
            // Keep original image if no new image was uploaded
            if (!uploadedProductImageBase64) {
                newProd.image = products[existingIdx].image;
            }
            products[existingIdx] = newProd;
        } else {
            products.push(newProd);
        }
        
        saveLocalProducts();
        showToast("Product saved locally!", "success");
        resetAdminProductForm();
        renderAdminInventoryTable();
        renderShopCatalog();
        renderFeaturedInventory();
    }
});

function resetAdminProductForm() {
    document.getElementById('admin-product-form').reset();
    document.getElementById('admin-prod-id').value = '';
    document.getElementById('admin-inventory-form-title').textContent = 'Add New Shop Product';
    document.getElementById('btn-admin-prod-cancel').style.display = 'none';
    document.getElementById('btn-admin-prod-submit').textContent = 'Save Product Listing';
    uploadedProductImageBase64 = null;
    prodPreview.innerHTML = '';
    currentEditingProductId = null;
}

document.getElementById('btn-admin-prod-cancel').addEventListener('click', resetAdminProductForm);

// Render Admin Product Listings Table
function renderAdminInventoryTable() {
    const tableBody = document.getElementById('admin-inventory-list-rows');
    tableBody.innerHTML = '';
    
    if (products.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No products listed yet.</td></tr>`;
        return;
    }
    
    products.forEach(p => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-color)';
        
        row.innerHTML = `
            <td style="padding:0.5rem;"><img src="${p.image}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color);"></td>
            <td style="padding:0.5rem; font-weight:600; font-size:0.88rem;">${p.title}</td>
            <td style="padding:0.5rem; font-size:0.88rem;">$${p.price.toLocaleString()}</td>
            <td style="padding:0.5rem; font-size:0.85rem; color:var(--text-secondary);">${p.category}</td>
            <td style="padding:0.5rem;"><span class="badge ${p.availability === 'Available' ? 'badge-bought' : 'badge-declined'}" style="font-size:0.7rem; padding: 2px 6px;">${p.availability}</span></td>
            <td style="padding:0.5rem; text-align:right;">
                <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.75rem;" onclick="editAdminProduct('${p.id}')">Edit</button>
                <button class="btn btn-secondary btn-sm" style="color:var(--accent-red); padding: 2px 6px; font-size: 0.75rem;" onclick="deleteAdminProduct('${p.id}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

window.editAdminProduct = function(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    
    currentEditingProductId = id;
    document.getElementById('admin-prod-id').value = p.id;
    document.getElementById('admin-prod-title').value = p.title;
    document.getElementById('admin-prod-price').value = p.price;
    document.getElementById('admin-prod-condition').value = p.condition;
    document.getElementById('admin-prod-category').value = p.category;
    document.getElementById('admin-prod-availability').value = p.availability;
    document.getElementById('admin-prod-desc').value = p.description;
    document.getElementById('admin-prod-shipping').value = p.shipping;
    
    uploadedProductImageBase64 = p.image;
    prodPreview.innerHTML = `
        <div class="uploaded-preview-item" style="width: 120px; height: 120px;">
            <img src="${p.image}">
            <button type="button" class="uploaded-preview-remove" id="btn-remove-prod-img">×</button>
        </div>
    `;
    document.getElementById('btn-remove-prod-img').addEventListener('click', () => {
        uploadedProductImageBase64 = null;
        prodPreview.innerHTML = '';
    });
    
    document.getElementById('admin-inventory-form-title').textContent = 'Edit Shop Product';
    document.getElementById('btn-admin-prod-cancel').style.display = 'inline-block';
    document.getElementById('btn-admin-prod-submit').textContent = 'Update Product Listing';
    
    window.scrollTo({ top: document.getElementById('admin-product-form').offsetTop - 100, behavior: 'smooth' });
};

window.deleteAdminProduct = function(id) {
    if (!confirm("Are you sure you want to delete this product listing?")) return;
    
    if (isFirebaseActive) {
        db.collection("products").doc(id).delete()
            .then(() => showToast("Product deleted.", "success"));
    } else {
        products = products.filter(p => p.id !== id);
        saveLocalProducts();
        showToast("Product deleted locally.", "success");
        renderAdminInventoryTable();
        renderShopCatalog();
        renderFeaturedInventory();
    }
};


// ==================== ADMIN CONTENT MANAGEMENT ====================

// Add Review Submit
document.getElementById('admin-review-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('admin-rev-name').value.trim();
    const location = document.getElementById('admin-rev-location').value.trim();
    const stars = parseInt(document.getElementById('admin-rev-stars').value);
    const text = document.getElementById('admin-rev-text').value.trim();
    
    const revId = 'rev-' + Math.random().toString(36).substr(2, 9);
    const newRev = { id: revId, name, location, stars, text };
    
    if (isFirebaseActive) {
        db.collection("reviews").doc(revId).set(newRev)
            .then(() => {
                showToast("Testimonial added to homepage!", "success");
                document.getElementById('admin-review-form').reset();
            });
    } else {
        reviews.push(newRev);
        saveLocalReviews();
        showToast("Testimonial added locally!", "success");
        document.getElementById('admin-review-form').reset();
        renderPublicReviews();
        renderAdminReviewsList();
    }
});

function renderAdminReviewsList() {
    const list = document.getElementById('admin-reviews-list');
    list.innerHTML = '';
    
    if (reviews.length === 0) {
        list.innerHTML = `<div style="color:var(--text-muted); font-size:0.88rem;">No customer testimonials listed.</div>`;
        return;
    }
    
    reviews.forEach(r => {
        const item = document.createElement('div');
        item.style.padding = '0.75rem';
        item.style.border = '1px solid var(--border-color)';
        item.style.borderRadius = '8px';
        item.style.background = 'rgba(0,0,0,0.1)';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        
        let starsStr = '⭐'.repeat(r.stars);
        
        item.innerHTML = `
            <div style="font-size:0.85rem;">
                <strong>${r.name} (${r.location})</strong> - ${starsStr}
                <p style="color:var(--text-secondary); margin:4px 0 0 0; font-size:0.8rem; font-style:italic;">"${r.text.substring(0, 70)}..."</p>
            </div>
            <button class="btn btn-secondary btn-sm" style="color:var(--accent-red); padding:2px 6px; font-size:0.75rem;" onclick="deleteAdminReview('${r.id}')">Delete</button>
        `;
        list.appendChild(item);
    });
}

window.deleteAdminReview = function(id) {
    if (!confirm("Remove this review from your website?")) return;
    
    if (isFirebaseActive) {
        db.collection("reviews").doc(id).delete()
            .then(() => showToast("Review removed.", "success"));
    } else {
        reviews = reviews.filter(r => r.id !== id);
        saveLocalReviews();
        showToast("Review removed locally.", "success");
        renderPublicReviews();
        renderAdminReviewsList();
    }
};

// Website Settings Manager form submit
document.getElementById('admin-settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-set-email').value.trim();
    const area = document.getElementById('admin-set-area').value.trim();
    
    const newSettings = { email, area };
    
    if (isFirebaseActive) {
        db.collection("settings").doc("config").set(newSettings)
            .then(() => showToast("Website contact settings updated!", "success"));
    } else {
        settings = newSettings;
        saveLocalSettings();
        showToast("Contact details saved locally!", "success");
        renderSettingsDetails();
    }
});

function renderSettingsDetails() {
    // Update contact settings forms
    document.getElementById('admin-set-email').value = settings.email;
    document.getElementById('admin-set-area').value = settings.area;
    
    // Update contact elements
    document.getElementById('contact-info-email').textContent = settings.email;
    document.getElementById('contact-info-email').href = `mailto:${settings.email}`;
    document.getElementById('contact-info-area').textContent = settings.area;
}

// Reset Database button trigger
document.getElementById('btn-admin-reset-db').addEventListener('click', () => {
    if (!confirm("Are you sure you want to delete all customizations and reseed the platform with defaults? This will erase all custom cards and collections.")) return;
    
    if (isFirebaseActive) {
        showToast("Reset cloud database in Firebase console. Local reset starting...");
        // Fallback local reset
    }
    
    localStorage.clear();
    collections = [];
    products = [];
    reviews = [];
    users = [];
    settings = {
        email: "lshaver@vault28cards.com",
        area: "Summerville, Charleston, and surrounding SC areas (Or secure nationwide shipping)"
    };
    
    showToast("Local Database Reset. Reseeding...", "success");
    initDatabase();
});


// ==================== PUBLIC SECTION RENDERS ====================

// Render Shop Catalog Grid
function renderShopCatalog() {
    const grid = document.getElementById('shop-catalog-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const searchVal = document.getElementById('shop-search').value.toLowerCase().trim();
    const selectedCategories = Array.from(document.querySelectorAll('.shop-category-filter:checked')).map(c => c.value);
    const maxPrice = parseFloat(document.getElementById('shop-price-slider').value);
    const sortVal = document.getElementById('shop-sort').value;
    
    let filtered = products.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchVal) || p.description.toLowerCase().includes(searchVal);
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category);
        const matchesPrice = p.price <= maxPrice;
        return matchesSearch && matchesCategory && matchesPrice;
    });
    
    // Sorting
    if (sortVal === 'price-low') filtered.sort((a,b) => a.price - b.price);
    else if (sortVal === 'price-high') filtered.sort((a,b) => b.price - a.price);
    else if (sortVal === 'title-asc') filtered.sort((a,b) => a.title.localeCompare(b.title));
    else filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (products.length === 0) {
        grid.innerHTML = `
            <div class="glass-card" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 2rem; text-align: center; border: 1px dashed rgba(223, 183, 80, 0.2); background: linear-gradient(135deg, rgba(223, 183, 80, 0.02) 0%, rgba(24, 26, 31, 0.8) 100%); border-radius: 12px; margin-bottom: 2rem; width: 100%;">
                <div style="font-size: 3.5rem; margin-bottom: 1.5rem; filter: drop-shadow(0 0 10px rgba(223, 183, 80, 0.3));">🏪</div>
                <h3 style="font-size: 1.75rem; font-family: var(--font-title); font-weight: 700; color: #ffffff; margin: 0 0 0.75rem 0; letter-spacing: 0.02em;">Vault 28 Shop — Up & Coming</h3>
                <p style="color: var(--text-secondary); max-width: 600px; line-height: 1.6; margin: 0 0 2rem 0; font-size: 0.95rem;">
                    Our online store catalog is currently under development. Lucas is cataloging new inventory daily. Stay tuned for a curated showcase of graded singles, raw vintage cards, wax boxes, and sports memorabilia!
                </p>
                <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 800px;">
                    <div class="glass-card" style="flex: 1; min-width: 200px; padding: 1.5rem; text-align: left; opacity: 0.7; border-color: rgba(255,255,255,0.05); filter: blur(0.5px); position: relative; overflow: hidden;">
                        <div style="background: rgba(255,255,255,0.05); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 1rem;">⚾</div>
                        <div style="height: 14px; background: rgba(255,255,255,0.1); border-radius: 4px; width: 60%; margin-bottom: 0.75rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 85%; margin-bottom: 0.5rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 40%; margin-bottom: 1.25rem;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                            <div style="height: 14px; background: rgba(223, 183, 80, 0.15); border-radius: 4px; width: 30%;"></div>
                            <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 25%;"></div>
                        </div>
                    </div>
                    
                    <div class="glass-card" style="flex: 1; min-width: 200px; padding: 1.5rem; text-align: left; opacity: 0.7; border-color: rgba(255,255,255,0.05); filter: blur(0.5px); position: relative; overflow: hidden;">
                        <div style="background: rgba(255,255,255,0.05); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 1rem;">🏀</div>
                        <div style="height: 14px; background: rgba(255,255,255,0.1); border-radius: 4px; width: 70%; margin-bottom: 0.75rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 75%; margin-bottom: 0.5rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 50%; margin-bottom: 1.25rem;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                            <div style="height: 14px; background: rgba(223, 183, 80, 0.15); border-radius: 4px; width: 35%;"></div>
                            <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 20%;"></div>
                        </div>
                    </div>
                    
                    <div class="glass-card" style="flex: 1; min-width: 200px; padding: 1.5rem; text-align: left; opacity: 0.7; border-color: rgba(255,255,255,0.05); filter: blur(0.5px); position: relative; overflow: hidden;">
                        <div style="background: rgba(255,255,255,0.05); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 1rem;">🏈</div>
                        <div style="height: 14px; background: rgba(255,255,255,0.1); border-radius: 4px; width: 65%; margin-bottom: 0.75rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 80%; margin-bottom: 0.5rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 45%; margin-bottom: 1.25rem;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                            <div style="height: 14px; background: rgba(223, 183, 80, 0.15); border-radius: 4px; width: 40%;"></div>
                            <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 30%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:4rem; color:var(--text-muted);">No products match your search filters.</div>`;
        return;
    }
    
    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'glass-card product-card';
        card.addEventListener('click', () => openProductModal(p.id));
        
        let badgeClass = p.availability === 'Available' ? 'badge-bought' : 'badge-declined';
        
        card.innerHTML = `
            <div class="product-card-img-wrapper">
                <img class="product-card-img" src="${p.image}">
                <span class="product-badge ${badgeClass}">${p.availability}</span>
            </div>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:0.5rem; flex-grow:1;">
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">${p.category}</span>
                <h3 style="font-size:1rem; margin:0; line-height:1.4; flex-grow:1; font-family:var(--font-title); font-weight:600;">${p.title}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; border-top:1px solid var(--border-color); padding-top:0.5rem;">
                    <span class="price-val" style="font-size:1.1rem; color:var(--accent-cyan); font-weight:700;">$${p.price.toLocaleString()}</span>
                    <span style="font-size:0.8rem; color:var(--text-secondary);">${p.condition}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Shop search and filters event listeners
if (document.getElementById('shop-search')) {
    document.getElementById('shop-search').addEventListener('input', renderShopCatalog);
}
document.querySelectorAll('.shop-category-filter').forEach(chk => chk.addEventListener('change', renderShopCatalog));
if (document.getElementById('shop-price-slider')) {
    document.getElementById('shop-price-slider').addEventListener('input', (e) => {
        const display = document.getElementById('shop-price-display');
        if (display) display.textContent = `$${parseFloat(e.target.value).toLocaleString()}`;
        renderShopCatalog();
    });
}
if (document.getElementById('shop-sort')) {
    document.getElementById('shop-sort').addEventListener('change', renderShopCatalog);
}
if (document.getElementById('btn-reset-shop-filters')) {
    document.getElementById('btn-reset-shop-filters').addEventListener('click', () => {
        const search = document.getElementById('shop-search');
        if (search) search.value = '';
        document.querySelectorAll('.shop-category-filter').forEach(chk => chk.checked = false);
        const slider = document.getElementById('shop-price-slider');
        if (slider) slider.value = 5000;
        const display = document.getElementById('shop-price-display');
        if (display) display.textContent = '$5,000';
        const sort = document.getElementById('shop-sort');
        if (sort) sort.value = 'recent';
        renderShopCatalog();
    });
}

// Product Modal Viewer
function openProductModal(id) {
    selectedProductId = id;
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    
    document.getElementById('shop-modal-img').src = p.image;
    document.getElementById('shop-modal-title').textContent = p.title;
    document.getElementById('shop-modal-price').textContent = `$${p.price.toLocaleString()}`;
    document.getElementById('shop-modal-category').textContent = p.category;
    document.getElementById('shop-modal-condition').textContent = p.condition;
    document.getElementById('shop-modal-status').textContent = p.availability;
    
    const statusLabel = document.getElementById('shop-modal-status');
    statusLabel.className = p.availability === 'Available' ? 'badge-bought' : 'badge-declined';
    
    document.getElementById('shop-modal-shipping').textContent = p.shipping;
    document.getElementById('shop-modal-desc').textContent = p.description;
    
    const inquireBtn = document.getElementById('btn-shop-modal-inquire');
    if (p.availability === 'Sold') {
        inquireBtn.disabled = true;
        inquireBtn.textContent = 'Listing Sold';
        inquireBtn.className = 'btn btn-secondary';
    } else {
        inquireBtn.disabled = false;
        inquireBtn.textContent = 'Inquire / Buy Card';
        inquireBtn.className = 'btn btn-primary';
    }
    
    document.getElementById('shop-product-modal').style.display = 'flex';
}

document.getElementById('btn-close-shop-modal').addEventListener('click', () => {
    document.getElementById('shop-product-modal').style.display = 'none';
});

// Product inquiry CTA click handler
document.getElementById('btn-shop-modal-inquire').addEventListener('click', () => {
    if (!selectedProductId) return;
    const p = products.find(prod => prod.id === selectedProductId);
    if (!p) return;
    
    document.getElementById('shop-product-modal').style.display = 'none';
    switchView('contact');
    
    // Autofill contact inquiry subject
    document.getElementById('contact-inquiry-subject').value = `Inquiry on Shop Item: ${p.title}`;
    document.getElementById('contact-inquiry-message').value = `Hi Vault 28, I saw the "${p.title}" listed in your shop for $${p.price.toLocaleString()} and would like to coordinate purchase/shipping options. Thanks!`;
    
    window.scrollTo({ top: document.getElementById('contact-form-inquiry').offsetTop - 100, behavior: 'smooth' });
    showToast("Opening inquiry email. Please enter your contact info.");
});

// Render Featured Shop Inventory on homepage
function renderFeaturedInventory() {
    const container = document.getElementById('landing-featured-inventory');
    if (!container) return;
    
    container.innerHTML = '';
    if (products.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; border: 1px dashed rgba(223, 183, 80, 0.2); background: linear-gradient(135deg, rgba(223, 183, 80, 0.02) 0%, rgba(24, 26, 31, 0.8) 100%); border-radius: 12px; margin-bottom: 2rem; width: 100%;">
                <div style="font-size: 3rem; margin-bottom: 1.5rem; filter: drop-shadow(0 0 10px rgba(223, 183, 80, 0.3));">🃏</div>
                <h3 style="font-size: 1.5rem; font-family: var(--font-title); font-weight: 700; color: #ffffff; margin: 0 0 0.75rem 0; letter-spacing: 0.02em;">Vault 28 Shop — Up & Coming</h3>
                <p style="color: var(--text-secondary); max-width: 600px; line-height: 1.6; margin: 0 0 2rem 0; font-size: 0.95rem;">
                    Our online store and inventory catalog are currently under development. Lucas is cataloging new inventory daily. Stay tuned for a curated showcase of graded singles, raw vintage cards, wax boxes, and sports memorabilia!
                </p>
                <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 800px;">
                    <div class="glass-card" style="flex: 1; min-width: 200px; padding: 1.5rem; text-align: left; opacity: 0.7; border-color: rgba(255,255,255,0.05); filter: blur(0.5px); position: relative; overflow: hidden;">
                        <div style="background: rgba(255,255,255,0.05); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 1rem;">⚾</div>
                        <div style="height: 14px; background: rgba(255,255,255,0.1); border-radius: 4px; width: 60%; margin-bottom: 0.75rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 85%; margin-bottom: 0.5rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 40%; margin-bottom: 1.25rem;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                            <div style="height: 14px; background: rgba(223, 183, 80, 0.15); border-radius: 4px; width: 30%;"></div>
                            <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 25%;"></div>
                        </div>
                    </div>
                    
                    <div class="glass-card" style="flex: 1; min-width: 200px; padding: 1.5rem; text-align: left; opacity: 0.7; border-color: rgba(255,255,255,0.05); filter: blur(0.5px); position: relative; overflow: hidden;">
                        <div style="background: rgba(255,255,255,0.05); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 1rem;">🏀</div>
                        <div style="height: 14px; background: rgba(255,255,255,0.1); border-radius: 4px; width: 70%; margin-bottom: 0.75rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 75%; margin-bottom: 0.5rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 50%; margin-bottom: 1.25rem;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                            <div style="height: 14px; background: rgba(223, 183, 80, 0.15); border-radius: 4px; width: 35%;"></div>
                            <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 20%;"></div>
                        </div>
                    </div>
                    
                    <div class="glass-card" style="flex: 1; min-width: 200px; padding: 1.5rem; text-align: left; opacity: 0.7; border-color: rgba(255,255,255,0.05); filter: blur(0.5px); position: relative; overflow: hidden;">
                        <div style="background: rgba(255,255,255,0.05); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 1rem;">🏈</div>
                        <div style="height: 14px; background: rgba(255,255,255,0.1); border-radius: 4px; width: 65%; margin-bottom: 0.75rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 80%; margin-bottom: 0.5rem;"></div>
                        <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 45%; margin-bottom: 1.25rem;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                            <div style="height: 14px; background: rgba(223, 183, 80, 0.15); border-radius: 4px; width: 40%;"></div>
                            <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 30%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    const active = products.filter(p => p.availability === 'Available').slice(0, 3);
    
    if (active.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding: 2rem;">No products currently featured.</div>`;
        return;
    }
    
    active.forEach(p => {
        const card = document.createElement('div');
        card.className = 'glass-card product-card';
        card.addEventListener('click', () => openProductModal(p.id));
        
        card.innerHTML = `
            <div class="product-card-img-wrapper">
                <img class="product-card-img" src="${p.image}">
            </div>
            <div style="padding:1rem; display:flex; flex-direction:column; gap:0.5rem; flex-grow:1;">
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">${p.category}</span>
                <h3 style="font-size:1rem; margin:0; line-height:1.4; flex-grow:1; font-family:var(--font-title); font-weight:600;">${p.title}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; border-top:1px solid var(--border-color); padding-top:0.5rem;">
                    <span class="price-val" style="font-size:1.1rem; color:var(--accent-cyan); font-weight:700;">$${p.price.toLocaleString()}</span>
                    <span style="font-size:0.8rem; color:var(--text-secondary);">${p.condition}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Render Public Reviews Testimonials
function renderPublicReviews() {
    const container = document.getElementById('landing-reviews-container');
    if (!container) return;
    
    container.innerHTML = '';
    reviews.forEach(r => {
        const card = document.createElement('div');
        card.className = 'glass-card review-card';
        
        let starsStr = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
        
        card.innerHTML = `
            <div class="review-stars">${starsStr}</div>
            <p class="review-comment">"${r.text}"</p>
            <div style="margin-top:0.5rem;">
                <div class="review-author">${r.name}</div>
                <div class="review-location">${r.location}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Render Recently Purchased Gallery on Landing page (displays our real JPGs)
function renderRecentlyPurchasedGallery() {
    const container = document.getElementById('landing-recent-gallery');
    if (!container) return;
    
    container.innerHTML = `
        <div class="glass-card" style="display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem;">
            <img src="assets/inventory3.jpg" alt="1989 Bowman" style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);">
            <h3 style="font-size: 1.05rem; margin-top: 0.5rem; font-family: var(--font-title); font-weight: 600;">1989 Bowman & Vintage Baseball Lot</h3>
            <p style="color: var(--text-secondary); font-size: 0.82rem; line-height: 1.5; flex-grow: 1;">Unopened 1989 Bowman Baseball boxes and multiple sorted storage cases of 70s-90s vintage baseball cards.</p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted);">
                <span>📍 Summerville, SC</span>
                <span class="badge badge-bought">Purchased</span>
            </div>
        </div>
        
        <div class="glass-card" style="display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem;">
            <img src="assets/inventory2.jpg" alt="Vintage Binders" style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);">
            <h3 style="font-size: 1.05rem; margin-top: 0.5rem; font-family: var(--font-title); font-weight: 600;">Classic Baseball Binders Lot</h3>
            <p style="color: var(--text-secondary); font-size: 0.82rem; line-height: 1.5; flex-grow: 1;">Acquired two massive card albums filled with 1970s and 1980s Topps, featuring rookie team sets and Hall of Famers.</p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted);">
                <span>📍 Charleston, SC</span>
                <span class="badge badge-bought">Purchased</span>
            </div>
        </div>

        <div class="glass-card" style="display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem;">
            <img src="assets/inventory4.jpg" alt="90s Sports Banners" style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);">
            <h3 style="font-size: 1.05rem; margin-top: 0.5rem; font-family: var(--font-title); font-weight: 600;">90s Basketball & Memorabilia Lot</h3>
            <p style="color: var(--text-secondary); font-size: 0.82rem; line-height: 1.5; flex-grow: 1;">A local buy of 90s basketball sets, hobby boxes, vintage Future Stars magazines, and classic team banners.</p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted);">
                <span>📍 Mt. Pleasant, SC</span>
                <span class="badge badge-bought">Purchased</span>
            </div>
        </div>
    `;
}

// Contact Inquiry Submission Handler
document.getElementById('contact-form-inquiry').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('contact-inquiry-name').value.trim();
    const email = document.getElementById('contact-inquiry-email').value.trim();
    const subject = document.getElementById('contact-inquiry-subject').value.trim();
    const msg = document.getElementById('contact-inquiry-message').value.trim();
    
    const newInquiry = {
        id: 'inq-' + Math.random().toString(36).substr(2, 9),
        name,
        email,
        subject,
        message: msg,
        status: 'Pending Response',
        messages: [
            { sender: 'customer', text: msg, createdAt: new Date().toISOString(), photos: contactAttachedPhotos }
        ],
        createdAt: new Date().toISOString()
    };
    
    if (isFirebaseActive) {
        // Save to inquiries collection for console logging
        db.collection("inquiries").doc(newInquiry.id).set(newInquiry);
        
        const logoUrl = `${window.location.origin}/assets/logo_transparent.png`;

        let emailAttachedPhotosHtml = '';
        if (contactAttachedPhotos && contactAttachedPhotos.length > 0) {
            emailAttachedPhotosHtml = `
                <p style="color: #dfb750; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; margin: 20px 0 10px 0;">Attached Photos</p>
                <div style="background-color: #0c0f19; border: 1px solid #1f293d; border-radius: 8px; padding: 15px; color: #cbd5e1; font-size: 14px;">
                    ${contactAttachedPhotos.map((src, index) => `<img src="${src}" alt="Attachment ${index + 1}" style="max-width: 100%; border-radius: 6px; border: 1px solid #1f293d; margin-bottom: 10px; display: block;" />`).join('')}
                </div>
            `;
        }

        // Write to mail collection to trigger the Firebase extension
        const emailPayload = {
            to: 'lshaver@vault28cards.com',
            message: {
                subject: `New Vault 28 Inquiry: ${subject}`,
                html: generateStandardEmailHtml(
                    `New Support Inquiry Submitted`,
                    `
                    <p>A support inquiry has been submitted by <strong>${name}</strong>.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
                        <tr style="border-bottom: 1px solid #1f293d;">
                            <td style="padding: 10px 0; color: #94a3b8; width: 140px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Sender</td>
                            <td style="padding: 10px 0; color: #ffffff; font-weight: 600;">${name}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #1f293d;">
                            <td style="padding: 10px 0; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Email</td>
                            <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #dfb750; text-decoration: none; font-weight: 600;">${email}</a></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #1f293d;">
                            <td style="padding: 10px 0; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Subject</td>
                            <td style="padding: 10px 0; color: #ffffff; font-weight: 500;">${subject}</td>
                        </tr>
                    </table>
                    
                    <p style="color: #dfb750; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin: 0 0 10px 0;">Customer Message</p>
                    <div style="background-color: #0c0f19; border: 1px solid #1f293d; border-radius: 8px; padding: 20px; color: #e2e8f0; font-size: 14px; line-height: 1.6; min-height: 80px; white-space: pre-wrap; border-left: 4px solid #dfb750; font-family: inherit; margin-bottom: 20px;">${msg}</div>
                    
                    ${emailAttachedPhotosHtml}
                    `,
                    `<a href="${window.location.origin}/?adminTab=inquiries" style="display: inline-block; background: linear-gradient(135deg, #f5d075 0%, #dfb750 100%); color: #0c0f19; font-weight: 700; font-size: 13px; padding: 12px 28px; text-decoration: none; border-radius: 25px; box-shadow: 0 4px 12px rgba(223, 183, 80, 0.25); text-transform: uppercase; letter-spacing: 0.08em;">Open Owner Console</a>`
                )
            }
        };

        db.collection("mail").add(emailPayload)
            .then(() => {
                // Send automated receipt confirmation email to customer
                const customerReceiptMail = {
                    to: email,
                    replyTo: 'lshaver@vault28cards.com',
                    message: {
                        subject: `We received your Vault 28 inquiry: ${subject}`,
                        html: generateStandardEmailHtml(
                            `Hi ${name},`,
                            `
                            <p>Thank you for reaching out to Vault 28 Trading Co.! We have received your inquiry regarding <strong>"${subject}"</strong>.</p>
                            <p>Our team is currently reviewing your message and we typically respond in <strong>under 24 hours</strong>.</p>
                            <p>You can track the status of your inquiry, chat with us online, or add more details by visiting your dedicated support thread.</p>
                            
                            <div style="border-top: 1px solid #1f293d; padding-top: 20px; margin-top: 20px; font-size: 13px;">
                                <strong style="color: #dfb750;">Your message:</strong><br>
                                <div style="background-color: #0c0f19; padding: 12px; border-radius: 6px; border-left: 3px solid #dfb750; color: #cbd5e1; margin-top: 8px; white-space: pre-wrap;">${msg}</div>
                            </div>
                            `,
                            `<a href="${window.location.origin}/contact-thread?id=${newInquiry.id}" style="display: inline-block; background: linear-gradient(135deg, #f5d075 0%, #dfb750 100%); color: #0c0f19; font-weight: 700; font-size: 13px; padding: 12px 28px; text-decoration: none; border-radius: 25px; box-shadow: 0 4px 12px rgba(223, 183, 80, 0.25); text-transform: uppercase; letter-spacing: 0.08em;">View Inquiry Thread</a>`
                        )
                    }
                };
                return db.collection("mail").add(customerReceiptMail);
            })
            .then(() => {
                showToast(`Thank you, ${name}! Your inquiry has been sent.`, "success");
                contactAttachedPhotos = [];
                const preview = document.getElementById('contact-images-preview');
                if (preview) preview.innerHTML = '';
                document.getElementById('contact-form-inquiry').reset();
            })
            .catch(err => {
                console.error("Error creating trigger email document:", err);
                // Fallback success notice if mail collection write fails but inquiries set succeeded
                showToast(`Thank you, ${name}! Your inquiry has been sent.`, "success");
                contactAttachedPhotos = [];
                const preview = document.getElementById('contact-images-preview');
                if (preview) preview.innerHTML = '';
                document.getElementById('contact-form-inquiry').reset();
            });
    } else {
        inquiries.push(newInquiry);
        localStorage.setItem('v28_inquiries', JSON.stringify(inquiries));
        showToast(`Inquiry saved to local sandbox!`, "success");
        contactAttachedPhotos = [];
        const preview = document.getElementById('contact-images-preview');
        if (preview) preview.innerHTML = '';
        document.getElementById('contact-form-inquiry').reset();
    }
});


// ==================== GLOBAL CONTROLS & BINDINGS ====================

// Contact Form Attached Photos State
let contactAttachedPhotos = [];

// Bind dropzone listeners for Contact Inquiry Form
setTimeout(() => {
    const contactDropzone = document.getElementById('contact-dropzone');
    const contactFileInput = document.getElementById('contact-file-input');
    const contactPreview = document.getElementById('contact-images-preview');
    
    if (contactDropzone && contactFileInput && contactPreview) {
        contactDropzone.addEventListener('click', () => contactFileInput.click());
        
        contactFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                Array.from(e.target.files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (el) => {
                        const base64 = el.target.result;
                        contactAttachedPhotos.push(base64);
                        
                        const thumb = document.createElement('div');
                        thumb.className = 'uploaded-preview-item';
                        thumb.style.position = 'relative';
                        thumb.innerHTML = `
                            <img src="${base64}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);" />
                            <button type="button" class="uploaded-preview-remove" style="position: absolute; top: -5px; right: -5px; background: var(--accent-red); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
                        `;
                        
                        thumb.querySelector('button').addEventListener('click', () => {
                            const idx = contactAttachedPhotos.indexOf(base64);
                            if (idx > -1) contactAttachedPhotos.splice(idx, 1);
                            thumb.remove();
                        });
                        
                        contactPreview.appendChild(thumb);
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }
}, 500);

document.getElementById('brand-logo').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('seller-landing');
});
document.getElementById('btn-nav-free-offer').addEventListener('click', () => switchView('seller-submit'));
document.getElementById('btn-hero-sell').addEventListener('click', () => switchView('seller-submit'));
document.getElementById('btn-hero-browse').addEventListener('click', () => switchView('shop'));
document.getElementById('btn-shop-coming-soon-sell').addEventListener('click', () => switchView('seller-submit'));

document.getElementById('btn-dashboard-new').addEventListener('click', () => switchView('seller-submit'));
document.getElementById('btn-seller-back-dashboard').addEventListener('click', () => switchView('seller-dashboard'));
document.getElementById('btn-buyer-back-dashboard').addEventListener('click', () => {
    renderBuyerDashboard();
    switchView('buyer-dashboard');
});

document.getElementById('btn-role-seller').addEventListener('click', () => setRole('seller'));
document.getElementById('btn-role-buyer').addEventListener('click', () => setRole('buyer'));

// Scroll Reveal observer
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
    
    reveals.forEach(el => observer.observe(el));
    
    setTimeout(() => {
        reveals.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top >= 0 && rect.top <= window.innerHeight) {
                el.classList.add('active');
            }
        });
    }, 200);
}

// ==================== ADMIN INQUIRIES MANAGEMENT ====================

function updateInquiriesBadge() {
    const badge = document.getElementById('admin-badge-inquiries');
    if (badge) {
        const pendingCount = inquiries.filter(inq => (inq.status || 'Pending Response') === 'Pending Response').length;
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline' : 'none';
    }
    const statTotal = document.getElementById('admin-stat-inquiries-total');
    if (statTotal) {
        statTotal.textContent = inquiries.length;
    }
}

function renderAdminInquiriesList() {
    const container = document.getElementById('admin-inquiries-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const filterStatus = document.getElementById('inquiry-filter-status')?.value || 'all';
    const sortOrder = document.getElementById('inquiry-sort-order')?.value || 'newest';
    
    let filtered = [...inquiries];
    if (filterStatus !== 'all') {
        filtered = filtered.filter(inq => {
            const stat = inq.status || 'Pending Response';
            return stat === filterStatus;
        });
    }
    
    filtered.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0);
        const timeB = new Date(b.createdAt || 0);
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                <p style="font-size: 1.1rem; margin: 0;">No inquiries match the active filters.</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach(inq => {
        const dateStr = new Date(inq.createdAt).toLocaleString();
        const status = inq.status || 'Pending Response';
        
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.padding = '1.5rem';
        
        let borderCol = 'var(--accent-gold)';
        let statusBadgeHTML = '';
        if (status === 'Pending Response') {
            borderCol = 'var(--accent-gold)';
            statusBadgeHTML = `<span class="badge" style="font-size: 0.85rem; padding: 4px 10px; background: rgba(223,183,80,0.1); border: 1px solid var(--accent-gold); color: var(--accent-gold); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; border-radius: 4px;">Pending Response</span>`;
        } else if (status === 'Waiting for Customer') {
            borderCol = '#3b82f6';
            statusBadgeHTML = `<span class="badge" style="font-size: 0.85rem; padding: 4px 10px; background: rgba(59,130,246,0.1); border: 1px solid #3b82f6; color: #3b82f6; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; border-radius: 4px;">Waiting for Customer</span>`;
        } else if (status === 'Resolved') {
            borderCol = '#10b981';
            statusBadgeHTML = `<span class="badge" style="font-size: 0.85rem; padding: 4px 10px; background: rgba(16,185,129,0.1); border: 1px solid #10b981; color: #10b981; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; border-radius: 4px;">Resolved</span>`;
        }
        
        card.style.borderLeft = `4px solid ${borderCol}`;
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '1rem';
        
        let msgs = inq.messages || [];
        if (msgs.length === 0) {
            msgs = [
                { sender: 'customer', text: inq.message, createdAt: inq.createdAt }
            ];
            if (inq.replyText) {
                msgs.push({ sender: 'owner', text: inq.replyText, createdAt: inq.repliedAt });
            }
        }
        
        let originalPhotosHTML = '';
        if (msgs[0].photos && msgs[0].photos.length > 0) {
            originalPhotosHTML = `
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;">
                    ${msgs[0].photos.map(pSrc => `<img src="${pSrc}" style="max-height: 120px; max-width: 120px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open('${pSrc}', '_blank')">`).join('')}
                </div>
            `;
        }

        let repliesHTML = '';
        if (msgs.length > 1) {
            for (let i = 1; i < msgs.length; i++) {
                const m = msgs[i];
                const replyDate = new Date(m.createdAt).toLocaleString();
                
                let msgPhotosHTML = '';
                if (m.photos && m.photos.length > 0) {
                    msgPhotosHTML = `
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;">
                            ${m.photos.map(pSrc => `<img src="${pSrc}" style="max-height: 120px; max-width: 120px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open('${pSrc}', '_blank')">`).join('')}
                        </div>
                    `;
                }

                if (m.sender === 'owner') {
                    repliesHTML += `
                        <div style="background: rgba(59, 130, 246, 0.03); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 6px; padding: 1rem; margin-top: 0.5rem;">
                            <p style="color: #3b82f6; font-size: 0.9rem; text-transform: uppercase; font-weight: 700; margin: 0 0 0.5rem 0; letter-spacing: 0.05em;">Your Reply (Sent via Email):</p>
                            <p style="color: var(--text-primary); font-size: 1.05rem; margin: 0; line-height: 1.5; white-space: pre-wrap;">${escapeHTML(m.text)}</p>
                            ${msgPhotosHTML}
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem; margin-bottom: 0;">Replied: ${replyDate}</p>
                        </div>
                    `;
                } else {
                    repliesHTML += `
                        <div style="background: rgba(223, 183, 80, 0.02); border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; margin-top: 0.5rem;">
                            <p style="color: var(--accent-gold); font-size: 0.9rem; text-transform: uppercase; font-weight: 700; margin: 0 0 0.5rem 0; letter-spacing: 0.05em;">Customer Reply:</p>
                            <p style="color: var(--text-primary); font-size: 1.05rem; margin: 0; line-height: 1.5; white-space: pre-wrap;">${escapeHTML(m.text)}</p>
                            ${msgPhotosHTML}
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem; margin-bottom: 0;">Sent: ${replyDate}</p>
                        </div>
                    `;
                }
            }
        }
        
        let historyToggleHTML = '';
        if (msgs.length > 1) {
            historyToggleHTML = `
                <button class="btn btn-secondary btn-sm" id="admin-btn-toggle-history-${inq.id}" onclick="toggleThreadHistory('${inq.id}', ${msgs.length - 1}, 'admin')" style="align-self: flex-start; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); font-weight: 600; padding: 6px 12px; border-radius: 6px;">Show Thread History (${msgs.length - 1} replies)</button>
            `;
        }
        
        const resolveButtonHTML = status === 'Resolved' ? 
            `<button class="btn btn-outline-gold btn-sm" onclick="toggleResolveInquiry('${inq.id}')">Mark Pending</button>` : 
            `<button class="btn btn-outline-cyan btn-sm" onclick="toggleResolveInquiry('${inq.id}')">Mark Resolved</button>`;
            
        const replyButtonHTML = status !== 'Resolved' ? 
            `<button class="btn btn-primary btn-sm" id="btn-show-reply-${inq.id}" onclick="toggleReplyForm('${inq.id}', true)">Reply to Message</button>` : 
            '';
            
        const replyFormHTML = `
            <div id="reply-form-${inq.id}" style="display: none; flex-direction: column; gap: 0.75rem; border-top: 1px dashed var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
                <textarea id="reply-text-${inq.id}" placeholder="Type your email response here..." rows="4" style="width: 100%; padding: 0.75rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-family: inherit; font-size: 0.9rem; line-height: 1.5; resize: vertical;"></textarea>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-primary btn-sm" onclick="sendInquiryReply('${inq.id}')">Send Email Reply</button>
                    <button class="btn btn-secondary btn-sm" onclick="toggleReplyForm('${inq.id}', false)">Cancel</button>
                </div>
            </div>
        `;
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    <h4 style="margin: 0; font-size: 1.25rem; color: var(--text-primary);">${escapeHTML(inq.name)} 
                        <span style="font-weight: normal; font-size: 0.95rem; color: var(--text-muted); margin-left: 0.5rem;">(${escapeHTML(inq.email)})</span>
                    </h4>
                    <p style="color: var(--accent-gold); font-size: 1.0rem; margin: 4px 0 0 0; font-weight: 500;">Subject: ${escapeHTML(inq.subject)}</p>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <span style="font-size: 0.9rem; color: var(--text-muted);">${dateStr}</span>
                    <div>${statusBadgeHTML}</div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 6px; padding: 1.25rem; color: var(--text-secondary); font-size: 1.05rem; line-height: 1.5; white-space: pre-wrap;">
                <span style="color: var(--accent-gold); font-size: 0.9rem; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.25rem; letter-spacing: 0.05em;">Original Inquiry:</span>
                ${escapeHTML(msgs[0].text)}
                ${originalPhotosHTML}
            </div>
            
            ${historyToggleHTML}
            
            <!-- Collapsible Replies Container -->
            <div id="admin-thread-history-${inq.id}" style="display: none; flex-direction: column; gap: 0.75rem;">
                ${repliesHTML}
            </div>
            
            <!-- CRM Controls -->
            <div id="controls-${inq.id}" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem; flex-wrap: wrap; gap: 0.75rem;">
                <div style="display: flex; gap: 0.5rem;">
                    ${replyButtonHTML}
                    ${resolveButtonHTML}
                </div>
                <button class="btn btn-sm" onclick="deleteInquiry('${inq.id}')" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">Delete Inquiry</button>
            </div>
            
            ${replyFormHTML}
        `;
        container.appendChild(card);
    });
}

window.toggleReplyForm = function(inqId, show) {
    const form = document.getElementById(`reply-form-${inqId}`);
    const controls = document.getElementById(`controls-${inqId}`);
    if (form) form.style.display = show ? 'flex' : 'none';
    if (controls) controls.style.display = show ? 'none' : 'flex';
};

window.deleteInquiry = function(inqId) {
    if (!confirm("Are you sure you want to delete this inquiry permanently? This action cannot be undone.")) return;
    
    if (isFirebaseActive) {
        db.collection("inquiries").doc(inqId).delete()
            .then(() => {
                showToast("Inquiry deleted permanently.", "success");
            })
            .catch(err => {
                console.error("Error deleting inquiry:", err);
                showToast("Could not delete inquiry.", "error");
            });
    } else {
        inquiries = inquiries.filter(i => i.id !== inqId);
        localStorage.setItem('v28_inquiries', JSON.stringify(inquiries));
        showToast("Inquiry deleted from sandbox.", "success");
        updateInquiriesBadge();
        renderAdminInquiriesList();
    }
};

window.toggleResolveInquiry = function(inqId) {
    const inq = inquiries.find(i => i.id === inqId);
    if (!inq) return;
    
    const currentStatus = inq.status || 'Pending Response';
    const newStatus = currentStatus === 'Resolved' ? 'Pending Response' : 'Resolved';
    
    if (isFirebaseActive) {
        db.collection("inquiries").doc(inqId).update({ status: newStatus })
            .then(() => {
                showToast(`Inquiry marked as ${newStatus}.`, "success");
            })
            .catch(err => {
                console.error("Error updating inquiry status:", err);
                showToast("Could not update status.", "error");
            });
    } else {
        inq.status = newStatus;
        localStorage.setItem('v28_inquiries', JSON.stringify(inquiries));
        showToast(`Inquiry status updated to ${newStatus}!`, "success");
        updateInquiriesBadge();
        renderAdminInquiriesList();
    }
};

window.sendInquiryReply = function(inqId) {
    const replyText = document.getElementById(`reply-text-${inqId}`).value.trim();
    if (!replyText) {
        showToast("Please enter a response message.", "error");
        return;
    }
    
    const inq = inquiries.find(i => i.id === inqId);
    if (!inq) return;
    
    const dateNow = new Date().toISOString();
    const currentMessages = inq.messages || [
        { sender: 'customer', text: inq.message, createdAt: inq.createdAt }
    ];
    
    currentMessages.push({
        sender: 'owner',
        text: replyText,
        createdAt: dateNow
    });
    
    const replyData = {
        replyText,
        repliedAt: dateNow,
        status: 'Waiting for Customer',
        messages: currentMessages
    };
    
    if (isFirebaseActive) {
        db.collection("inquiries").doc(inqId).update(replyData)
            .then(() => {
                const replyMail = {
                    to: inq.email,
                    replyTo: 'lshaver@vault28cards.com',
                    message: {
                        subject: `Re: [Vault 28] Reply to your inquiry: ${inq.subject}`,
                        html: generateStandardEmailHtml(
                            `Hi ${inq.name},`,
                            `
                            <p>Lucas from Vault 28 Trading Co. has responded to your inquiry:</p>
                            <div style="background-color: #0c0f19; border-left: 4px solid #dfb750; padding: 15px; border-radius: 6px; margin: 20px 0; color: #ffffff; white-space: pre-wrap;">${replyText}</div>
                            <p>You can reply directly to this email or chat with us online at your dedicated support thread.</p>
                            `,
                            `<a href="${window.location.origin}/contact-thread?id=${inq.id}" style="display: inline-block; background: linear-gradient(135deg, #f5d075 0%, #dfb750 100%); color: #0c0f19; font-weight: 700; font-size: 13px; padding: 12px 28px; text-decoration: none; border-radius: 25px; box-shadow: 0 4px 12px rgba(223, 183, 80, 0.25); text-transform: uppercase; letter-spacing: 0.08em;">Open Support Thread</a>`
                        )
                    }
                };
                
                return db.collection("mail").add(replyMail);
            })
            .then(() => {
                showToast("Reply sent successfully via email!", "success");
            })
            .catch(err => {
                console.error("Error sending inquiry reply:", err);
                showToast("Could not send reply.", "error");
            });
    } else {
        Object.assign(inq, replyData);
        localStorage.setItem('v28_inquiries', JSON.stringify(inquiries));
        showToast("Reply simulated in sandbox mode!", "success");
        updateInquiriesBadge();
        renderAdminInquiriesList();
    }
};

window.loadCustomerThreadDetail = function(inqId) {
    if (!inqId) return;
    
    const renderThread = (inq) => {
        document.getElementById('customer-thread-subject').textContent = inq.subject;
        document.getElementById('customer-thread-name').textContent = inq.name;
        document.getElementById('customer-thread-email').textContent = inq.email;
        
        // Status badge
        const badge = document.getElementById('customer-thread-status-badge');
        const status = inq.status || 'Pending Response';
        if (badge) {
            badge.style.fontSize = '0.85rem';
            badge.style.padding = '4px 10px';
            badge.style.textTransform = 'uppercase';
            badge.style.fontWeight = '700';
            badge.style.letterSpacing = '0.05em';
            badge.style.borderRadius = '4px';
            badge.style.display = 'inline-block';
            
            if (status === 'Pending Response') {
                badge.textContent = 'Pending Response';
                badge.style.background = 'rgba(223,183,80,0.1)';
                badge.style.border = '1px solid var(--accent-gold)';
                badge.style.color = 'var(--accent-gold)';
            } else if (status === 'Waiting for Customer') {
                badge.textContent = 'Waiting for Response';
                badge.style.background = 'rgba(59,130,246,0.1)';
                badge.style.border = '1px solid #3b82f6';
                badge.style.color = '#3b82f6';
            } else if (status === 'Resolved') {
                badge.textContent = 'Resolved';
                badge.style.background = 'rgba(16,185,129,0.1)';
                badge.style.border = '1px solid #10b981';
                badge.style.color = '#10b981';
            }
        }
        
        // Render messages
        const chatLog = document.getElementById('customer-thread-chat-log');
        chatLog.innerHTML = '';
        
        let msgs = inq.messages || [];
        if (msgs.length === 0) {
            msgs = [
                { sender: 'customer', text: inq.message, createdAt: inq.createdAt }
            ];
            if (inq.replyText) {
                msgs.push({ sender: 'owner', text: inq.replyText, createdAt: inq.repliedAt });
            }
        }
        
        msgs.forEach(m => {
            const bubble = document.createElement('div');
            const dateStr = new Date(m.createdAt).toLocaleString();
            
            let photosHTML = '';
            if (m.photos && m.photos.length > 0) {
                photosHTML = `
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; margin-bottom: 0.25rem;">
                        ${m.photos.map(pSrc => `<img src="${pSrc}" style="max-height: 120px; max-width: 120px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open('${pSrc}', '_blank')">`).join('')}
                    </div>
                `;
            }

            if (m.sender === 'customer') {
                bubble.style.maxWidth = '80%';
                bubble.style.padding = '0.85rem 1.1rem';
                bubble.style.borderRadius = '12px 12px 0 12px';
                bubble.style.background = 'rgba(223,183,80,0.06)';
                bubble.style.border = '1px solid rgba(223,183,80,0.15)';
                bubble.style.color = 'var(--text-primary)';
                bubble.style.marginLeft = 'auto';
                bubble.style.lineHeight = '1.5';
                bubble.innerHTML = `
                    <p style="margin: 0; font-size: 1.02rem; white-space: pre-wrap; text-align: left;">${escapeHTML(m.text)}</p>
                    ${photosHTML}
                    <span style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; text-align: right;">${dateStr}</span>
                `;
            } else {
                bubble.style.maxWidth = '80%';
                bubble.style.padding = '0.85rem 1.1rem';
                bubble.style.borderRadius = '12px 12px 12px 0';
                bubble.style.background = 'rgba(59,130,246,0.06)';
                bubble.style.border = '1px solid rgba(59,130,246,0.15)';
                bubble.style.color = 'var(--text-primary)';
                bubble.style.marginRight = 'auto';
                bubble.style.lineHeight = '1.5';
                bubble.innerHTML = `
                    <p style="margin: 0; font-size: 1.02rem; white-space: pre-wrap; text-align: left;">${escapeHTML(m.text)}</p>
                    ${photosHTML}
                    <span style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; text-align: left;">${dateStr}</span>
                `;
            }
            chatLog.appendChild(bubble);
        });
        
        // Scroll chat log to bottom
        setTimeout(() => {
            chatLog.scrollTop = chatLog.scrollHeight;
        }, 100);
        
        // Toggle reply form and support message banner
        const msgBlock = document.getElementById('customer-thread-resolved-message');
        if (status === 'Resolved') {
            document.getElementById('customer-thread-reply-form').style.display = 'none';
            msgBlock.style.display = 'block';
            msgBlock.style.background = 'rgba(16, 185, 129, 0.05)';
            msgBlock.style.borderColor = 'rgba(16, 185, 129, 0.15)';
            msgBlock.style.color = 'var(--accent-emerald)';
            msgBlock.innerHTML = `
                <p style="font-weight: 600; margin: 0; font-size: 1.05rem;">This inquiry has been marked as Resolved.</p>
                <p style="font-size: 0.85rem; margin-top: 0.25rem; color: var(--text-secondary); margin-bottom: 0;">If you have further questions, please submit a new contact form.</p>
            `;
        } else if (status === 'Pending Response') {
            document.getElementById('customer-thread-reply-form').style.display = 'none';
            msgBlock.style.display = 'block';
            msgBlock.style.background = 'rgba(223, 183, 80, 0.05)';
            msgBlock.style.borderColor = 'rgba(223, 183, 80, 0.15)';
            msgBlock.style.color = 'var(--accent-gold)';
            msgBlock.innerHTML = `
                <p style="font-weight: 600; margin: 0; font-size: 1.02rem;">Pending Response</p>
                <p style="font-size: 0.85rem; margin-top: 0.25rem; color: var(--text-secondary); margin-bottom: 0;">We have received your message and will respond shortly. You will receive an email once we reply.</p>
            `;
        } else {
            document.getElementById('customer-thread-reply-form').style.display = 'flex';
            msgBlock.style.display = 'none';
        }
    };
    
    if (isFirebaseActive) {
        db.collection("inquiries").doc(inqId).get()
            .then(doc => {
                if (doc.exists) {
                    renderThread({ id: doc.id, ...doc.data() });
                } else {
                    showToast("Thread not found.", "error");
                    switchView('seller-landing');
                }
            })
            .catch(err => {
                console.error("Error loading customer thread:", err);
                showToast("Could not load thread.", "error");
            });
    } else {
        const inq = inquiries.find(i => i.id === inqId);
        if (inq) {
            renderThread(inq);
        } else {
            showToast("Sandbox thread not found.", "error");
            switchView('seller-landing');
        }
    }
};

let threadReplyAttachedPhotos = [];

window.handleThreadReplyPhotosChange = function(input) {
    const previewDiv = document.getElementById('customer-thread-reply-preview');
    const countSpan = document.getElementById('customer-thread-reply-photo-count');
    if (!previewDiv || !countSpan) return;
    
    threadReplyAttachedPhotos = [];
    previewDiv.innerHTML = '';
    
    if (input.files.length === 0) {
        countSpan.textContent = 'No files selected';
        return;
    }
    
    countSpan.textContent = `${input.files.length} file(s) selected`;
    
    Array.from(input.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            threadReplyAttachedPhotos.push(base64);
            
            const thumb = document.createElement('div');
            thumb.className = 'uploaded-preview-item';
            thumb.style.position = 'relative';
            thumb.style.width = '70px';
            thumb.style.height = '70px';
            thumb.innerHTML = `
                <img src="${base64}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);" />
            `;
            previewDiv.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });
};

window.sendCustomerThreadReply = function() {
    const replyText = document.getElementById('customer-thread-reply-text').value.trim();
    if (!replyText) {
        showToast("Please enter a reply message.", "error");
        return;
    }
    
    if (!selectedInquiryId) return;
    
    const photos = threadReplyAttachedPhotos;
    
    if (isFirebaseActive) {
        db.collection("inquiries").doc(selectedInquiryId).get()
            .then(doc => {
                if (!doc.exists) throw new Error("Inquiry not found");
                const inq = doc.data();
                const msgs = inq.messages || [{ sender: 'customer', text: inq.message, createdAt: inq.createdAt }];
                
                msgs.push({
                    sender: 'customer',
                    text: replyText,
                    createdAt: new Date().toISOString(),
                    photos: photos
                });
                
                return db.collection("inquiries").doc(selectedInquiryId).update({
                    messages: msgs,
                    status: 'Pending Response'
                }).then(() => {
                    threadReplyAttachedPhotos = [];
                    const preview = document.getElementById('customer-thread-reply-preview');
                    if (preview) preview.innerHTML = '';
                    const countSpan = document.getElementById('customer-thread-reply-photo-count');
                    if (countSpan) countSpan.textContent = 'No files selected';
                    const fileInput = document.getElementById('customer-thread-reply-file-input');
                    if (fileInput) fileInput.value = '';
                    
                    let replyPhotosEmailHtml = '';
                    if (photos && photos.length > 0) {
                        replyPhotosEmailHtml = `
                            <p style="color: #dfb750; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; margin: 20px 0 10px 0;">Attached Photos</p>
                            <div style="background-color: #0c0f19; border: 1px solid #1f293d; border-radius: 8px; padding: 15px; color: #cbd5e1; font-size: 14px;">
                                ${photos.map((src, index) => `<img src="${src}" alt="Reply Attachment ${index + 1}" style="max-width: 100%; border-radius: 6px; border: 1px solid #1f293d; margin-bottom: 10px; display: block;" />`).join('')}
                            </div>
                        `;
                    }
                    const ownerNotificationMail = {
                        to: 'lshaver@vault28cards.com',
                        replyTo: inq.email,
                        message: {
                            subject: `Customer Replied: ${inq.subject}`,
                            html: generateStandardEmailHtml(
                                `Customer Replied`,
                                `
                                <p>The customer <strong>${inq.name}</strong> (${inq.email}) has replied to their inquiry:</p>
                                <div style="background-color: #0c0f19; border-left: 4px solid #dfb750; padding: 15px; border-radius: 6px; margin: 20px 0; color: #ffffff; white-space: pre-wrap;">${replyText}</div>
                                ${replyPhotosEmailHtml}
                                `,
                                `<a href="${window.location.origin}/?adminTab=inquiries" style="display: inline-block; background: linear-gradient(135deg, #f5d075 0%, #dfb750 100%); color: #0c0f19; font-weight: 700; font-size: 13px; padding: 12px 28px; text-decoration: none; border-radius: 25px; box-shadow: 0 4px 12px rgba(223, 183, 80, 0.25); text-transform: uppercase; letter-spacing: 0.08em;">Open Owner Console</a>`
                            )
                        }
                    };
                    return db.collection("mail").add(ownerNotificationMail);
                });
            })
            .then(() => {
                showToast("Reply sent!", "success");
                document.getElementById('customer-thread-reply-text').value = '';
                loadCustomerThreadDetail(selectedInquiryId);
            })
            .catch(err => {
                console.error("Error submitting customer reply:", err);
                showToast("Could not send reply.", "error");
            });
    } else {
        const inq = inquiries.find(i => i.id === selectedInquiryId);
        if (inq) {
            if (!inq.messages) {
                inq.messages = [{ sender: 'customer', text: inq.message, createdAt: inq.createdAt }];
            }
            inq.messages.push({
                sender: 'customer',
                text: replyText,
                createdAt: new Date().toISOString()
            });
            inq.status = 'Pending Response';
            localStorage.setItem('v28_inquiries', JSON.stringify(inquiries));
            showToast("Reply simulated in sandbox!", "success");
            document.getElementById('customer-thread-reply-text').value = '';
            loadCustomerThreadDetail(selectedInquiryId);
        }
    }
};

// Step Wizard State Manager
let currentWizardStep = 1;

window.updateWizardUI = function() {
    // Hide all panes
    document.querySelectorAll('.wizard-pane').forEach(p => p.style.display = 'none');
    // Show current pane
    const activePane = document.getElementById('wizard-pane-' + currentWizardStep);
    if (activePane) activePane.style.display = 'flex';
    
    // Update progress indicator nodes
    document.querySelectorAll('.wizard-step-node').forEach((node, index) => {
        const stepNum = index + 1;
        const numCircle = node.querySelector('.step-num');
        const textSpan = node.querySelector('span');
        
        if (stepNum < currentWizardStep) {
            // Completed step
            node.classList.add('completed');
            node.classList.remove('active');
            if (numCircle) {
                numCircle.innerHTML = '✓';
                numCircle.style.background = 'var(--accent-cyan)';
                numCircle.style.borderColor = 'var(--accent-cyan)';
                numCircle.style.color = 'var(--bg-primary)';
            }
            if (textSpan) textSpan.style.color = 'var(--accent-cyan)';
        } else if (stepNum === currentWizardStep) {
            // Active step
            node.classList.add('active');
            node.classList.remove('completed');
            if (numCircle) {
                numCircle.innerHTML = stepNum;
                numCircle.style.background = 'var(--bg-secondary)';
                numCircle.style.borderColor = 'var(--accent-cyan)';
                numCircle.style.color = 'var(--accent-cyan)';
            }
            if (textSpan) textSpan.style.color = 'var(--text-primary)';
        } else {
            // Future step
            node.classList.remove('active', 'completed');
            if (numCircle) {
                numCircle.innerHTML = stepNum;
                numCircle.style.background = 'var(--bg-secondary)';
                numCircle.style.borderColor = 'rgba(255,255,255,0.15)';
                numCircle.style.color = 'var(--text-muted)';
            }
            if (textSpan) textSpan.style.color = 'var(--text-muted)';
        }
    });
    
    // Progress Line width
    const progressBar = document.getElementById('wizard-progress-bar');
    if (progressBar) {
        if (currentWizardStep === 1) progressBar.style.width = '0%';
        else if (currentWizardStep === 2) progressBar.style.width = '50%';
        else if (currentWizardStep === 3) progressBar.style.width = '100%';
    }
    
    // Update buttons
    const btnPrev = document.getElementById('btn-wizard-prev');
    const btnNext = document.getElementById('btn-wizard-next');
    const btnSubmit = document.getElementById('btn-wizard-submit');
    
    if (currentWizardStep === 1) {
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) {
            btnNext.style.display = 'inline-flex';
            btnNext.style.marginLeft = 'auto';
        }
        if (btnSubmit) btnSubmit.style.display = 'none';
    } else if (currentWizardStep === 2) {
        if (btnPrev) btnPrev.style.display = 'inline-flex';
        if (btnNext) {
            btnNext.style.display = 'inline-flex';
            btnNext.style.marginLeft = '0';
        }
        if (btnSubmit) btnSubmit.style.display = 'none';
    } else if (currentWizardStep === 3) {
        if (btnPrev) btnPrev.style.display = 'inline-flex';
        if (btnNext) btnNext.style.display = 'none';
        if (btnSubmit) {
            btnSubmit.style.display = 'inline-flex';
            btnSubmit.style.marginLeft = '0';
        }
    }
};

// Bind wizard navigation listeners
setTimeout(() => {
    const btnPrev = document.getElementById('btn-wizard-prev');
    const btnNext = document.getElementById('btn-wizard-next');
    
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            // Validate inputs in the current step pane
            const activePane = document.getElementById('wizard-pane-' + currentWizardStep);
            if (activePane) {
                const inputs = activePane.querySelectorAll('input, select, textarea');
                let allValid = true;
                inputs.forEach(input => {
                    if (!input.checkValidity()) {
                        input.reportValidity();
                        allValid = false;
                    }
                });
                if (!allValid) return;
            }
            
            if (currentWizardStep < 3) {
                currentWizardStep++;
                updateWizardUI();
                window.scrollTo({ top: document.getElementById('submission-card-box').offsetTop - 120, behavior: 'smooth' });
            }
        });
    }
    
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentWizardStep > 1) {
                currentWizardStep--;
                updateWizardUI();
                window.scrollTo({ top: document.getElementById('submission-card-box').offsetTop - 120, behavior: 'smooth' });
            }
        });
    }
}, 500);

// Hero image slideshow logic
function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;
    
    let currentIndex = 0;
    setInterval(() => {
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    }, 4500);
}

// DOM Init
document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('sandbox-banner');
    if (banner) banner.style.display = 'none';
    
    const btnSetup = document.getElementById('btn-setup-db');
    if (btnSetup) {
        btnSetup.addEventListener('click', () => {
            document.getElementById('db-setup-modal').style.display = 'flex';
        });
    }
    const btnCloseDb = document.getElementById('btn-close-db-modal');
    if (btnCloseDb) {
        btnCloseDb.addEventListener('click', () => {
            const modal = document.getElementById('db-setup-modal');
            if (modal) modal.style.display = 'none';
        });
    }
    const btnCloseDbOk = document.getElementById('btn-close-db-modal-ok');
    if (btnCloseDbOk) {
        btnCloseDbOk.addEventListener('click', () => {
            const modal = document.getElementById('db-setup-modal');
            if (modal) modal.style.display = 'none';
        });
    }

    initDatabase();
    setRole('seller');
    initScrollReveal();
    initHeroSlider();
    updateWizardUI();
});

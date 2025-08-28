document.addEventListener('DOMContentLoaded', () => {
    // --- PARTIE 1: ANIMATION DE FOND ---
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray;

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x; this.y = y; this.directionX = directionX;
            this.directionY = directionY; this.size = size; this.color = color;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    function initParticles() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 9000;
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 2) + 1;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * .4) - .2;
            let directionY = (Math.random() * .4) - .2;
            let color = 'rgba(155, 89, 182, 0.6)';
            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }
    
    function animateParticles() {
        requestAnimationFrame(animateParticles);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
    }

    initParticles();
    animateParticles();
    window.addEventListener('resize', () => {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        initParticles();
    });

    // --- PARTIE 2: LOGIQUE TWITCH ---
    const twitchLoginBtn = document.getElementById('twitch-login-btn');
    const actionButtons = document.getElementById('action-buttons');
    const banBtn = document.getElementById('ban-btn');
    const remodBtn = document.getElementById('remod-btn');

    // **IMPORTANT** : Remplacez par vos propres informations
    const CLIENT_ID = 'kqrhb79zczyxoh0uzlouwka4e2xbw7'; 
    const REDIRECT_URI = 'http://localhost:5500/index.html'; // Doit correspondre à l'URI de redirection dans votre application Twitch
    const YOUR_CHANNEL_NAME = 'tmzypher'; // Le nom de la chaîne où les actions auront lieu
    const TARGET_USER_NAME = 'chbiiidou'; // L'utilisateur à bannir/moder

    let accessToken = null;
    let broadcasterId = null;
    let targetUserId = null;
    
    // Au chargement de la page, on vérifie si un token est dans l'URL
    const params = new URLSearchParams(window.location.hash.substring(1));
    accessToken = params.get('access_token');

    if (accessToken) {
        console.log('Connecté avec succès !');
        twitchLoginBtn.classList.add('hidden');
        actionButtons.classList.remove('hidden');
        // On récupère les informations nécessaires (ID de la chaîne et de l'utilisateur cible)
        initializeApp();
    }

    twitchLoginBtn.addEventListener('click', () => {
        // Scopes nécessaires pour les actions
        const scopes = 'channel:manage:moderators moderation:manage';
        const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${scopes}`;
        window.location.href = authUrl;
    });

    async function getUserData(username) {
        const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-ID': CLIENT_ID
            }
        });
        const data = await response.json();
        return data.data[0];
    }
    
    async function initializeApp() {
        const yourChannelData = await getUserData(YOUR_CHANNEL_NAME);
        const targetUserData = await getUserData(TARGET_USER_NAME);

        if (yourChannelData && targetUserData) {
            broadcasterId = yourChannelData.id;
            targetUserId = targetUserData.id;
            console.log(`Prêt à agir sur la chaîne ${YOUR_CHANNEL_NAME} (ID: ${broadcasterId}) concernant l'utilisateur ${TARGET_USER_NAME} (ID: ${targetUserId})`);
        } else {
            alert("Erreur: Impossible de récupérer les informations de la chaîne ou de l'utilisateur.");
        }
    }

    banBtn.addEventListener('click', async () => {
        if (!broadcasterId || !targetUserId) return alert("Données non initialisées.");
        
        const reason = "Timeout de 5 minutes via l'interface custom.";
        try {
            const response = await fetch(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-ID': CLIENT_ID,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        user_id: targetUserId,
                        duration: 300, // 300 secondes = 5 minutes
                        reason: reason
                    }
                })
            });
            if (response.ok) {
                alert(`${TARGET_USER_NAME} a été banni pour 5 minutes !`);
            } else {
                const error = await response.json();
                alert(`Erreur lors du bannissement: ${error.message}`);
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    });

    remodBtn.addEventListener('click', async () => {
        if (!broadcasterId || !targetUserId) return alert("Données non initialisées.");

        try {
            // Ajout en tant que modérateur
            const modResponse = await fetch(`https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${targetUserId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-ID': CLIENT_ID
                }
            });

            if (modResponse.status === 204) {
                 alert(`${TARGET_USER_NAME} a bien été ajouté comme modérateur !`);
            } else {
                 const error = await modResponse.json();
                 alert(`Erreur lors de l'ajout du modérateur: ${error.message}`);
            }
            
            // L'API Twitch ne permet pas d'ajouter un éditeur via un endpoint direct comme pour les modérateurs.
            // Cette action doit être effectuée manuellement depuis le tableau de bord du créateur.
            // On peut toutefois notifier l'utilisateur de cette limitation.
            alert("Note : Le rôle d'éditeur doit être ajouté manuellement depuis votre tableau de bord créateur Twitch.");

        } catch (error) {
            console.error('Erreur:', error);
        }
    });
});
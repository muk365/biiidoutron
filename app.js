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
    const REDIRECT_URI = 'https://biiidoutron.netlify.app/index.html'; // Mettez votre URL Netlify ici !
    const YOUR_CHANNEL_NAME = 'tmzypher'; // Le nom de la chaîne où les actions auront lieu
    const TARGET_USER_NAME = 'chbiiidou'; // L'utilisateur à bannir/moder

    let accessToken = null;
    let broadcasterId = null;
    let targetUserId = null;
    
    const params = new URLSearchParams(window.location.hash.substring(1));
    accessToken = params.get('access_token');

    if (accessToken) {
        console.log('Connecté avec succès !');
        twitchLoginBtn.classList.add('hidden');
        actionButtons.classList.remove('hidden');
        initializeApp();
    }

    twitchLoginBtn.addEventListener('click', () => {
        // Scopes corrigés et nécessaires pour les actions
        const scopes = 'channel:manage:moderators moderator:manage:banned_users';
        const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${scopes}`;
        window.location.href = authUrl;
    });

    async function getUserData(username) {
        const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Client-ID': CLIENT_ID }
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
        
        try {
            const response = await fetch(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-ID': CLIENT_ID,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: { user_id: targetUserId, duration: 300, reason: "Timeout de 5 minutes." }
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

    // ### LOGIQUE DU BOUTON 2 ENTIÈREMENT RÉÉCRITE ###
    remodBtn.addEventListener('click', async () => {
        if (!broadcasterId || !targetUserId) return alert("Données non initialisées.");

        try {
            // --- Étape 1: Unban de l'utilisateur ---
            const unbanResponse = await fetch(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}&user_id=${targetUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-ID': CLIENT_ID
                }
            });

            if (unbanResponse.status === 204) {
                console.log(`${TARGET_USER_NAME} a été débanni.`);
            } else {
                console.warn(`Avertissement lors du débannissement (code: ${unbanResponse.status}). Ce n'est peut-être pas une erreur si l'utilisateur n'était pas banni.`);
            }

            // --- Étape 2: Ajout en tant que modérateur ---
            const modResponse = await fetch(`https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${targetUserId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-ID': CLIENT_ID
                }
            });

            if (modResponse.status === 204) {
                 alert(`${TARGET_USER_NAME} a été débanni (si nécessaire) et promu modérateur !`);
            } else {
                 const error = await modResponse.json();
                 alert(`L'utilisateur a été débanni, mais une erreur est survenue lors de l'ajout en modérateur: ${error.message}`);
            }

        } catch (error) {
            console.error('Erreur globale lors de l\'action Unban + Remod:', error);
            alert("Une erreur inattendue est survenue. Vérifiez la console pour plus de détails.");
        }
    });
});
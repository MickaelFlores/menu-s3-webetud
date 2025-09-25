// ==UserScript==
// @name         Menu Ressources S3 + Cookie Transfer (PHPSESSID + MoodleSession) + Session Keeper
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Menu moderne des ressources S3 pour webetud.iut-blagnac.fr + Transfère PHPSESSID et MoodleSession entre domaines + Maintien automatique des sessions ScoDoc
// @author       Vous
// @match        https://webetud.iut-blagnac.fr/*
// @match        https://scodocetudiant.iut-blagnac.fr/*
// @match        https://iam-mickael.me/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @updateURL    none
// @downloadURL  none
// ==/UserScript==

(function () {
    'use strict';

    // ================================
    // CONFIGURATION SESSION KEEPER
    // ================================
    const SESSION_KEEPER_CONFIG = {
        apiUrl: 'https://iam-mickael.me/session-keeper/session_api.php',
        enabled: true,
        debug: true
    };

    // ================================
    // CONFIGURATION MENU S3
    // ================================
    const S3_CONFIG = {
        enabled: true,
        resources: [
            { name: 'Dashboard IUT', url: 'https://iam-mickael.me/', icon: '📊' },
            { name: 'ScoDoc Étudiant', url: 'https://scodocetudiant.iut-blagnac.fr/', icon: '📚' },
            { name: 'WebEtud', url: 'https://webetud.iut-blagnac.fr/', icon: '🎓' },
            { name: 'Moodle', url: 'https://webetud.iut-blagnac.fr/moodle/', icon: '📖' },
            { name: 'Planning', url: 'https://webetud.iut-blagnac.fr/php/planning/', icon: '📅' }
        ]
    };

    // ================================
    // INITIALISATION
    // ================================
    window.addEventListener('DOMContentLoaded', function () {
        initCookieTransfer();
        if (S3_CONFIG.enabled) {
            initS3Menu();
        }
    });

    // Si DOMContentLoaded a déjà été déclenché
    if (document.readyState !== 'loading') {
        initCookieTransfer();
        if (S3_CONFIG.enabled) {
            initS3Menu();
        }
    }

    // ================================
    // PARTIE 1: GESTION DES COOKIES
    // ================================

    function initCookieTransfer() {
        // ===== GESTION SCODOC (PHPSESSID) =====
        if (window.location.hostname === 'scodocetudiant.iut-blagnac.fr') {
            console.log('🔐 Initialisation récupération PHPSESSID sur ScoDoc');

            // Attendre que la page soit chargée pour ScoDoc
            window.addEventListener('load', function () {
                setTimeout(() => {
                    const phpsessid = getCookieValue('PHPSESSID');
                    if (phpsessid) {
                        GM_setValue('scodoc_phpsessid', phpsessid);
                        GM_log('scodoc_phpsessid sauvegardé: ' + phpsessid);
                        console.log('✅ ScoDoc PHPSESSID sauvegardé:', phpsessid.substring(0, 10) + '...');

                        // Envoyer à l'API de maintien des sessions
                        sendSessionToKeeper(phpsessid, 'PHPSESSID');
                    } else {
                        console.log('⚠️ PHPSESSID non trouvé sur ScoDoc');
                    }
                }, 2000); // Attendre 2 secondes pour que la session soit établie
            });

            // Observer les changements de cookies PHPSESSID avec un délai plus long
            setTimeout(() => {
                observeCookieChanges('PHPSESSID', 'scodoc_phpsessid');
            }, 3000);
        }

        // ===== GESTION WEBETUD/MOODLE (MoodleSession) =====
        if (window.location.hostname === 'webetud.iut-blagnac.fr') {
            console.log('🔐 Initialisation récupération MoodleSession sur WebEtud');

            // Attendre que la page soit chargée pour WebEtud/Moodle
            window.addEventListener('load', function () {
                setTimeout(() => {
                    const moodleSession = getCookieValue('MoodleSession');
                    if (moodleSession) {
                        GM_setValue('MoodleSession', moodleSession);
                        GM_log('MoodleSession sauvegardé: ' + moodleSession);
                        console.log('✅ Moodle Session sauvegardé:', moodleSession.substring(0, 10) + '...');

                        // Envoyer à l'API de maintien des sessions
                        sendSessionToKeeper(moodleSession, 'MoodleSession');
                    } else {
                        console.log('⚠️ MoodleSession non trouvé sur WebEtud');
                    }
                }, 2000); // Attendre 2 secondes pour que la session soit établie
            });

            // Observer les changements de cookies MoodleSession avec un délai plus long
            setTimeout(() => {
                observeCookieChanges('MoodleSession', 'MoodleSession');
            }, 3000);
        }

        // ===== APPLICATION DES COOKIES SUR iam-mickael.me =====
        if (window.location.hostname === 'iam-mickael.me') {
            console.log('🔐 Application des cookies sur iam-mickael.me');

            // Récupérer et appliquer le cookie PHPSESSID de ScoDoc
            const storedPhpSessId = GM_getValue('scodoc_phpsessid');
            if (storedPhpSessId) {
                document.cookie = `scodoc_phpsessid=${storedPhpSessId}; path=/; domain=.iam-mickael.me; secure; samesite=lax`;
                GM_log('scodoc_phpsessid appliqué: ' + storedPhpSessId);
                console.log('✅ ScoDoc PHPSESSID appliqué sur iam-mickael.me:', storedPhpSessId.substring(0, 10) + '...');
            } else {
                console.log('⚠️ Aucun PHPSESSID ScoDoc stocké');
            }

            // Récupérer et appliquer le cookie MoodleSession de WebEtud
            const storedMoodleSession = GM_getValue('MoodleSession');
            if (storedMoodleSession) {
                document.cookie = `MoodleSession=${storedMoodleSession}; path=/; domain=.iam-mickael.me; secure; samesite=lax`;
                GM_log('MoodleSession appliqué: ' + storedMoodleSession);
                console.log('✅ Moodle Session appliqué sur iam-mickael.me:', storedMoodleSession.substring(0, 10) + '...');
            } else {
                console.log('⚠️ Aucun MoodleSession stocké');
            }

            // Notification de statut des cookies
            showCookieStatusNotification(storedPhpSessId, storedMoodleSession);
        }
    }

    // ================================
    // PARTIE 2: SESSION KEEPER
    // ================================

    /**
     * Observer les changements de cookies pour détecter un nouveau cookie
     */
    function observeCookieChanges(cookieName, storageKey) {
        if (!SESSION_KEEPER_CONFIG.enabled) return;

        let lastCookieValue = GM_getValue(storageKey) || null;
        let checkCount = 0;
        const maxChecks = 200; // Limiter à 200 vérifications (10 minutes)

        console.log(`🔄 Démarrage observation ${cookieName} sur ${window.location.hostname}`);

        // Fonction pour vérifier les changements
        function checkCookieChanges() {
            checkCount++;
            const currentCookieValue = getCookieValue(cookieName);

            if (currentCookieValue && currentCookieValue !== lastCookieValue) {
                if (SESSION_KEEPER_CONFIG.debug) {
                    console.log(`🔄 Nouveau ${cookieName} détecté:`, currentCookieValue.substring(0, 10) + '...');
                }

                lastCookieValue = currentCookieValue;
                GM_setValue(storageKey, currentCookieValue);
                sendSessionToKeeper(currentCookieValue, cookieName);
            }

            // Arrêter après un certain nombre de vérifications
            if (checkCount >= maxChecks) {
                console.log(`⏹️ Arrêt observation ${cookieName} après ${maxChecks} vérifications`);
                clearInterval(intervalId);
            }
        }

        // Vérifier toutes les 3 secondes
        const intervalId = setInterval(checkCookieChanges, 3000);

        // Vérifier aussi au chargement initial après un délai
        setTimeout(checkCookieChanges, 1500);
        setTimeout(checkCookieChanges, 5000);
        setTimeout(checkCookieChanges, 10000);
    }
    /**
     * Récupérer la valeur d'un cookie
     */
    function getCookieValue(name) {
        try {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [key, value] = cookie.trim().split('=');
                if (key === name && value) {
                    return decodeURIComponent(value);
                }
            }
        } catch (e) {
            console.error('Erreur lecture cookie:', e);
        }
        return null;
    }

    /**
     * Envoyer le cookie à l'API de maintien des sessions
     */
    function sendSessionToKeeper(cookieValue, cookieType) {
        if (!SESSION_KEEPER_CONFIG.enabled || !cookieValue) {
            return;
        }

        if (SESSION_KEEPER_CONFIG.debug) {
            console.log(`📤 Envoi du ${cookieType} à l'API Session Keeper...`);
        }

        // Utiliser GM_xmlhttpRequest pour éviter les problèmes CORS
        GM_xmlhttpRequest({
            method: 'POST',
            url: SESSION_KEEPER_CONFIG.apiUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                cookie_value: cookieValue,
                cookie_type: cookieType,
                domain: window.location.hostname
            }),
            timeout: 10000,
            onload: function (response) {
                try {
                    const result = JSON.parse(response.responseText);

                    if (result.success) {
                        if (SESSION_KEEPER_CONFIG.debug) {
                            console.log(`✅ ${cookieType} envoyé avec succès:`, result.message);
                        }
                        GM_log(`Session Keeper ${cookieType}: ` + result.message);

                        // Afficher une notification discrète
                        showSessionKeeperNotification(`${cookieType} sauvegardé pour maintien automatique`, 'success');

                    } else {
                        console.warn(`⚠️ Erreur API Session Keeper pour ${cookieType}:`, result.message);
                        showSessionKeeperNotification(`Erreur ${cookieType}: ` + result.message, 'error');
                    }

                } catch (e) {
                    console.error('❌ Erreur parsing réponse API:', e);
                    showSessionKeeperNotification('Erreur de communication avec l\'API', 'error');
                }
            },
            onerror: function (error) {
                console.error(`❌ Erreur requête API Session Keeper pour ${cookieType}:`, error);
                showSessionKeeperNotification('Erreur de connexion à l\'API', 'error');
            },
            ontimeout: function () {
                console.warn(`⏱️ Timeout API Session Keeper pour ${cookieType}`);
                showSessionKeeperNotification('Timeout API - Réessayer plus tard', 'warning');
            }
        });
    }



    /**
     * Afficher le statut des cookies sur iam-mickael.me
     */
    function showCookieStatusNotification(phpsessid, moodleSession) {
        const status = document.createElement('div');
        status.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            font-size: 14px;
            z-index: 10000;
            max-width: 350px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const scodocStatus = phpsessid ? '✅ ScoDoc connecté' : '❌ ScoDoc non connecté';
        const moodleStatus = moodleSession ? '✅ Moodle connecté' : '❌ Moodle non connecté';

        status.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">🔐 Statut des sessions</div>
            <div style="margin-bottom: 4px;">${scodocStatus}</div>
            <div>${moodleStatus}</div>
        `;

        document.body.appendChild(status);

        // Masquer après 8 secondes
        setTimeout(() => {
            status.style.opacity = '0';
            status.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (status.parentNode) {
                    status.parentNode.removeChild(status);
                }
            }, 300);
        }, 8000);
    }

    // ================================
    // PARTIE 3: MENU S3 RESSOURCES
    // ================================

    function initS3Menu() {
        // Ne créer le menu que sur webetud.iut-blagnac.fr
        if (window.location.hostname !== 'webetud.iut-blagnac.fr') {
            return;
        }

        createS3Menu();
    }

    function createS3Menu() {
        // Attendre que le body soit disponible
        const waitForBody = setInterval(() => {
            if (document.body) {
                clearInterval(waitForBody);
                insertS3Menu();
            }
        }, 100);
    }

    function insertS3Menu() {
        // Ne charger le menu que sur webetud.iut-blagnac.fr
        if (window.location.hostname !== 'webetud.iut-blagnac.fr') {
            return;
        }

        // Attendre que le DOM soit chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createS3Menu);
        } else {
            createS3Menu();
        }
    }

    function createS3Menu() {
        // Configuration des ressources avec leurs IDs
        const resources = [
            { code: "R3.01", name: "Développement Web", id: "827" },
            { code: "R3.02", name: "Programmes efficaces", id: "828" },
            { code: "R3.03", name: "Analyse", id: "829" },
            { code: "R3.04", name: "Qualité de développement", id: "830" },
            { code: "R3.05", name: "Programmation système", id: "843" },
            { code: "R3.06", name: "Architecture Réseaux", id: "832" },
            { code: "R3.07", name: "SQL et programmation", id: "833" },
            { code: "R3.08", name: "Probabilités", id: "834" },
            { code: "R3.09", name: "Cryptographie", id: "835" },
            { code: "R3.10", name: "Management SI", id: "836" },
            { code: "R3.11", name: "Droit contrats et numérique", id: "837" },
            { code: "R3.12", name: "Anglais", id: "875" },
            { code: "R3.13", name: "Communication professionnelle", id: "839" },
            { code: "R3.14", name: "PPP Portfolio", id: "840" },
            { code: "R3.15", name: "IoT", id: "880" }
        ];

        // Styles CSS modernes inspirés d'iOS
        const styles = `
            #s3-resources-menu {
                position: fixed;
                top: 60px;
                right: 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            #s3-menu-button {
                background: rgba(0, 122, 255, 0.9);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                color: white;
                font-size: 14px;
                font-weight: 600;
                padding: 12px 20px;
                cursor: pointer;
                box-shadow: 0 8px 32px rgba(0, 122, 255, 0.3);
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                user-select: none;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            #s3-menu-button:hover {
                background: rgba(0, 122, 255, 1);
                transform: translateY(-2px);
                box-shadow: 0 12px 40px rgba(0, 122, 255, 0.4);
            }

            #s3-menu-button:active {
                transform: translateY(0);
                transition: transform 0.1s;
            }

            #s3-menu-dropdown {
                position: absolute;
                top: 60px;
                right: 0;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 16px;
                min-width: 320px;
                max-height: 500px;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                pointer-events: none;
            }

            #s3-menu-dropdown.show {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }

            .menu-header {
                padding: 20px 20px 10px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                background: linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(0, 122, 255, 0.05));
                border-radius: 16px 16px 0 0;
            }

            .menu-title {
                font-size: 18px;
                font-weight: 700;
                color: #1d1d1f;
                margin: 0;
            }

            .menu-subtitle {
                font-size: 14px;
                color: #86868b;
                margin: 4px 0 0;
            }

            .menu-items {
                padding: 8px;
            }

            .menu-item {
                display: block;
                padding: 12px 16px;
                text-decoration: none;
                color: #1d1d1f;
                border-radius: 12px;
                margin: 2px 0;
                transition: all 0.2s ease;
                position: relative;
            }

            .menu-item:hover {
                background: rgba(0, 122, 255, 0.1);
                transform: translateX(4px);
            }

            .menu-item:active {
                background: rgba(0, 122, 255, 0.2);
                transform: translateX(2px);
            }

            .item-code {
                font-size: 12px;
                font-weight: 600;
                color: #007aff;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .item-name {
                font-size: 14px;
                font-weight: 500;
                margin-top: 2px;
                line-height: 1.3;
            }

            .menu-arrow {
                transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }

            .menu-arrow.rotated {
                transform: rotate(180deg);
            }

            /* Scrollbar personnalisée pour WebKit */
            #s3-menu-dropdown::-webkit-scrollbar {
                width: 6px;
            }

            #s3-menu-dropdown::-webkit-scrollbar-track {
                background: transparent;
            }

            #s3-menu-dropdown::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
            }

            #s3-menu-dropdown::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 0, 0, 0.3);
            }

            /* Animation d'entrée pour les éléments du menu */
            .menu-item {
                animation: slideInItem 0.3s ease-out forwards;
                opacity: 0;
                transform: translateX(-10px);
            }

            @keyframes slideInItem {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;

        // Créer et injecter les styles
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);

        // Créer le menu
        const menuContainer = document.createElement('div');
        menuContainer.id = 's3-resources-menu';

        // Bouton principal
        const menuButton = document.createElement('div');
        menuButton.id = 's3-menu-button';
        menuButton.innerHTML = `
            <span>Ressources S3</span>
            <span class="menu-arrow">▼</span>
        `;

        // Dropdown menu
        const dropdown = document.createElement('div');
        dropdown.id = 's3-menu-dropdown';

        // Header du menu
        const menuHeader = document.createElement('div');
        menuHeader.className = 'menu-header';
        menuHeader.innerHTML = `
            <h3 class="menu-title">Ressources - S3</h3>
            <p class="menu-subtitle">Accès rapide aux cours</p>
        `;

        // Items du menu
        const menuItems = document.createElement('div');
        menuItems.className = 'menu-items';

        resources.forEach((resource, index) => {
            const item = document.createElement('a');
            item.className = 'menu-item';
            item.href = `https://webetud.iut-blagnac.fr/course/view.php?id=${resource.id}`;
            item.style.animationDelay = `${index * 0.05}s`;
            item.innerHTML = `
                <div class="item-code">${resource.code}</div>
                <div class="item-name">${resource.name}</div>
            `;
            menuItems.appendChild(item);
        });

        // Assembler le menu
        dropdown.appendChild(menuHeader);
        dropdown.appendChild(menuItems);
        menuContainer.appendChild(menuButton);
        menuContainer.appendChild(dropdown);

        // Ajouter au DOM
        document.body.appendChild(menuContainer);

        // Gestion des événements
        let isMenuOpen = false;
        const arrow = menuButton.querySelector('.menu-arrow');

        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            isMenuOpen = !isMenuOpen;

            if (isMenuOpen) {
                dropdown.classList.add('show');
                arrow.classList.add('rotated');
                // Réanimer les items
                const items = dropdown.querySelectorAll('.menu-item');
                items.forEach((item, index) => {
                    item.style.animation = 'none';
                    setTimeout(() => {
                        item.style.animation = `slideInItem 0.3s ease-out forwards`;
                        item.style.animationDelay = `${index * 0.05}s`;
                    }, 10);
                });
            } else {
                dropdown.classList.remove('show');
                arrow.classList.remove('rotated');
            }
        });

        // Fermer le menu en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!menuContainer.contains(e.target) && isMenuOpen) {
                dropdown.classList.remove('show');
                arrow.classList.remove('rotated');
                isMenuOpen = false;
            }
        });

        // Fermer le menu avec Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) {
                dropdown.classList.remove('show');
                arrow.classList.remove('rotated');
                isMenuOpen = false;
            }
        });

        console.log('Menu Ressources S3 chargé avec succès!');
    }

    // ================================
    // PARTIE 4: UTILITAIRES
    // ================================


    window.testCookieRetrieval = function () {
        console.log('=== TEST RÉCUPÉRATION COOKIES ===');
        console.log('Domaine actuel:', window.location.hostname);
        console.log('Cookies disponibles:', document.cookie);

        if (window.location.hostname === 'scodocetudiant.iut-blagnac.fr') {
            const phpsessid = getCookieValue('PHPSESSID');
            console.log('PHPSESSID trouvé:', phpsessid ? '✅ ' + phpsessid.substring(0, 10) + '...' : '❌ Non trouvé');
        }

        if (window.location.hostname === 'webetud.iut-blagnac.fr') {
            const moodleSession = getCookieValue('MoodleSession');
            console.log('MoodleSession trouvé:', moodleSession ? '✅ ' + moodleSession.substring(0, 10) + '...' : '❌ Non trouvé');
        }

        console.log('Cookies stockés:');
        console.log('- ScoDoc PHPSESSID:', GM_getValue('scodoc_phpsessid') || 'Non stocké');
        console.log('- MoodleSession:', GM_getValue('MoodleSession') || 'Non stocké');
    };



    /**
     * Fonction utilitaire pour vérifier le statut des sessions
     * (Accessible via la console pour debug)
     */
    window.checkSessionKeeperStatus = function () {
        if (!SESSION_KEEPER_CONFIG.enabled) {
            console.log('❌ Session Keeper désactivé');
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: SESSION_KEEPER_CONFIG.apiUrl,
            timeout: 5000,
            onload: function (response) {
                try {
                    const result = JSON.parse(response.responseText);
                    console.log('📊 Statut Session Keeper:', result);
                } catch (e) {
                    console.error('Erreur parsing statut:', e);
                }
            },
            onerror: function () {
                console.error('Erreur connexion API statut');
            }
        });
    };

    /**
     * Fonction pour vérifier les cookies stockés
     */
    window.checkStoredCookies = function () {
        const scodoc = GM_getValue('scodoc_phpsessid');
        const moodle = GM_getValue('MoodleSession');

        console.log('🔐 Cookies stockés:');
        console.log('ScoDoc PHPSESSID:', scodoc ? '✅ ' + scodoc.substring(0, 10) + '...' : '❌ Non trouvé');
        console.log('Moodle Session:', moodle ? '✅ ' + moodle.substring(0, 10) + '...' : '❌ Non trouvé');

        return { scodoc, moodle };
    };

    // Log de démarrage
    console.log('🚀 Script Tampermonkey S3 + Dual Session Keeper chargé');
    console.log('📍 Domaine actuel:', window.location.hostname);
    console.log('🔧 Session Keeper:', SESSION_KEEPER_CONFIG.enabled ? 'Activé' : 'Désactivé');
    console.log('🎛️ Menu S3:', S3_CONFIG.enabled ? 'Activé' : 'Désactivé');

    // Log spécifique selon le domaine
    if (window.location.hostname === 'scodocetudiant.iut-blagnac.fr') {
        console.log('🍪 Mode: Récupération PHPSESSID sur ScoDoc');
    } else if (window.location.hostname === 'webetud.iut-blagnac.fr') {
        console.log('🍪 Mode: Récupération MoodleSession sur WebEtud + Menu S3');
    } else if (window.location.hostname === 'iam-mickael.me') {
        console.log('🍪 Mode: Application des cookies stockés');
    }

    console.log('💡 Tapez testCookieRetrieval() dans la console pour tester manuellement');

})();

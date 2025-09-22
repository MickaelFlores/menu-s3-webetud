// ==UserScript==
// @name         Menu Ressources S3 + Cookie PHPSESSID + Session Keeper
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Menu moderne des ressources S3 pour webetud.iut-blagnac.fr + Transfère le cookie PHPSESSID entre domaines + Maintien automatique des sessions ScoDoc
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

(function() {
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
    window.addEventListener('DOMContentLoaded', function() {
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
        if (window.location.hostname === 'scodocetudiant.iut-blagnac.fr') {
            // Attendre que la page soit chargée
            window.addEventListener('load', function() {
                function getCookie(name) {
                    const cookies = document.cookie.split(';');
                    for (let cookie of cookies) {
                        const [key, value] = cookie.trim().split('=');
                        if (key === name) return value;
                    }
                    return null;
                }

                const phpsessid = getCookie('PHPSESSID');
                if (phpsessid) {
                    GM_setValue('scodoc_phpsessid', phpsessid);
                    GM_log('scodoc_phpsessid sauvegardé: ' + phpsessid);
                    console.log('scodoc_phpsessid sauvegardé: ' + phpsessid);

                    // NOUVELLE FONCTIONNALITÉ: Envoyer à l'API de maintien des sessions
                    sendSessionToKeeper(phpsessid);
                }
            });

            // Observer les changements de cookies (nouveau PHPSESSID)
            observeCookieChanges();
        }

        if (window.location.hostname === 'iam-mickael.me') {
            // Récupérer et appliquer le cookie
            const storedCookie = GM_getValue('scodoc_phpsessid');
            if (storedCookie) {
                document.cookie = `scodoc_phpsessid=${storedCookie}; path=/; domain=.iam-mickael.me; secure; samesite=lax`;
                GM_log('scodoc_phpsessid appliqué: ' + storedCookie);
                console.log('scodoc_phpsessid appliqué: ' + storedCookie);
            }
        }
    }

    // ================================
    // PARTIE 2: SESSION KEEPER
    // ================================

    /**
     * Observer les changements de cookies pour détecter un nouveau PHPSESSID
     */
    function observeCookieChanges() {
        if (!SESSION_KEEPER_CONFIG.enabled) return;

        let lastPhpsessid = null;

        // Fonction pour vérifier les changements
        function checkCookieChanges() {
            const currentPhpsessid = getCookieValue('PHPSESSID');

            if (currentPhpsessid && currentPhpsessid !== lastPhpsessid) {
                if (SESSION_KEEPER_CONFIG.debug) {
                    console.log('🔄 Nouveau PHPSESSID détecté:', currentPhpsessid);
                }

                lastPhpsessid = currentPhpsessid;
                sendSessionToKeeper(currentPhpsessid);
            }
        }

        // Vérifier toutes les 2 secondes
        setInterval(checkCookieChanges, 2000);

        // Vérifier aussi au chargement initial
        setTimeout(checkCookieChanges, 1000);
    }

    /**
     * Récupérer la valeur d'un cookie
     */
    function getCookieValue(name) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) return value;
        }
        return null;
    }

    /**
     * Envoyer le PHPSESSID à l'API de maintien des sessions
     */
    function sendSessionToKeeper(phpsessid) {
        if (!SESSION_KEEPER_CONFIG.enabled || !phpsessid) {
            return;
        }

        if (SESSION_KEEPER_CONFIG.debug) {
            console.log('📤 Envoi du PHPSESSID à l\'API Session Keeper...');
        }

        // Utiliser GM_xmlhttpRequest pour éviter les problèmes CORS
        GM_xmlhttpRequest({
            method: 'POST',
            url: SESSION_KEEPER_CONFIG.apiUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                phpsessid: phpsessid
            }),
            timeout: 10000,
            onload: function(response) {
                try {
                    const result = JSON.parse(response.responseText);

                    if (result.success) {
                        if (SESSION_KEEPER_CONFIG.debug) {
                            console.log('✅ Session envoyée avec succès à l\'API:', result.message);
                        }
                        GM_log('Session Keeper: ' + result.message);

                        // Afficher une notification discrète
                        showSessionKeeperNotification('Session sauvegardée pour maintien automatique', 'success');

                    } else {
                        console.warn('⚠️ Erreur API Session Keeper:', result.message);
                        showSessionKeeperNotification('Erreur: ' + result.message, 'error');
                    }

                } catch (e) {
                    console.error('❌ Erreur parsing réponse API:', e);
                    showSessionKeeperNotification('Erreur de communication avec l\'API', 'error');
                }
            },
            onerror: function(error) {
                console.error('❌ Erreur requête API Session Keeper:', error);
                showSessionKeeperNotification('Erreur de connexion à l\'API', 'error');
            },
            ontimeout: function() {
                console.warn('⏱️ Timeout API Session Keeper');
                showSessionKeeperNotification('Timeout API - Réessayer plus tard', 'warning');
            }
        });
    }

    /**
     * Afficher une notification discrète
     */
    function showSessionKeeperNotification(message, type = 'info') {
        // Vérifier si on est sur ScoDoc pour afficher la notification
        if (window.location.hostname !== 'scodocetudiant.iut-blagnac.fr') {
            return;
        }

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        // Couleurs selon le type
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = '🔐 ' + message;

        document.body.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Masquer après 4 secondes
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
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

    /**
     * Fonction utilitaire pour vérifier le statut des sessions
     * (Accessible via la console pour debug)
     */
    window.checkSessionKeeperStatus = function() {
        if (!SESSION_KEEPER_CONFIG.enabled) {
            console.log('❌ Session Keeper désactivé');
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: SESSION_KEEPER_CONFIG.apiUrl,
            timeout: 5000,
            onload: function(response) {
                try {
                    const result = JSON.parse(response.responseText);
                    console.log('📊 Statut Session Keeper:', result);
                } catch (e) {
                    console.error('Erreur parsing statut:', e);
                }
            },
            onerror: function() {
                console.error('Erreur connexion API statut');
            }
        });
    };

    // Log de démarrage
    console.log('🚀 Script Tampermonkey S3 + Session Keeper chargé');
    console.log('📍 Domaine:', window.location.hostname);
    console.log('🔧 Session Keeper:', SESSION_KEEPER_CONFIG.enabled ? 'Activé' : 'Désactivé');
    console.log('🎛️ Menu S3:', S3_CONFIG.enabled ? 'Activé' : 'Désactivé');

})();

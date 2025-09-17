// ==UserScript==
// @name         Menu Ressources S3 - Webetud
// @namespace    https://github.com/votre-username/menu-s3-webetud
// @version      1.0.0
// @description  Menu moderne des ressources S3 pour webetud.iut-blagnac.fr avec extraction automatique
// @author       Votre Nom
// @match        https://webetud.iut-blagnac.fr/*
// @grant        none
// @homepage     https://github.com/votre-username/menu-s3-webetud
// @supportURL   https://github.com/votre-username/menu-s3-webetud/issues
// @downloadURL  https://raw.githubusercontent.com/votre-username/menu-s3-webetud/main/menu-s3.user.js
// @updateURL    https://raw.githubusercontent.com/votre-username/menu-s3-webetud/main/menu-s3.user.js
// @icon         https://webetud.iut-blagnac.fr/theme/image.php/boost/theme/1741768230/favicon
// ==/UserScript==

(function() {
    'use strict';

    // Fonction pour extraire automatiquement les ressources depuis la page
    function extractResourcesFromPage() {
        const resources = [];
        
        // Méthode 1: Extraction depuis la liste des cours sur la page de catégorie
        const courseBoxes = document.querySelectorAll('.coursebox');
        courseBoxes.forEach(box => {
            const linkElement = box.querySelector('.coursename a.aalink');
            if (linkElement) {
                const fullName = linkElement.textContent.trim();
                const href = linkElement.href;
                
                // Extraire l'ID depuis l'URL
                const idMatch = href.match(/id=(\d+)/);
                if (idMatch && fullName.startsWith('R3.')) {
                    const id = idMatch[1];
                    const parts = fullName.split(' - ');
                    const code = parts[0];
                    const name = parts.slice(1).join(' - ') || fullName;
                    
                    resources.push({ code, name, id });
                }
            }
        });

        // Méthode 2: Extraction depuis la navigation latérale si la première méthode échoue
        if (resources.length === 0) {
            const navLinks = document.querySelectorAll('#inst720 .tree_item a[href*="course/view.php"]');
            navLinks.forEach(link => {
                const fullName = link.textContent.trim();
                const href = link.href;
                
                const idMatch = href.match(/id=(\d+)/);
                if (idMatch && fullName.match(/^R3\.\d+/)) {
                    const id = idMatch[1];
                    // Nettoyer le nom (certains sont abrégés dans la nav)
                    const code = fullName.match(/^R3\.\d+/)[0];
                    const name = fullName.replace(code, '').replace(/^\s*-\s*/, '').trim() || 
                                getFullNameFromCode(code);
                    
                    resources.push({ code, name, id });
                }
            });
        }

        // Tri par code de ressource
        resources.sort((a, b) => a.code.localeCompare(b.code));
        
        console.log('Ressources extraites:', resources);
        return resources;
    }

    // Mapping des codes vers les noms complets (fallback)
    function getFullNameFromCode(code) {
        const nameMap = {
            'R3.01': 'Développement Web',
            'R3.02': 'Programmes efficaces', 
            'R3.03': 'Analyse',
            'R3.04': 'Qualité de développement',
            'R3.05': 'Programmation système',
            'R3.06': 'Architecture Réseaux',
            'R3.07': 'SQL et programmation',
            'R3.08': 'Probabilités',
            'R3.09': 'Cryptographie',
            'R3.10': 'Management SI',
            'R3.11': 'Droit contrats et numérique',
            'R3.12': 'Anglais',
            'R3.13': 'Communication professionnelle',
            'R3.14': 'PPP Portfolio',
            'R3.15': 'IoT'
        };
        return nameMap[code] || code;
    }

    // Configuration des ressources (automatique ou fallback manuel)
    let resources = extractResourcesFromPage();
    
    // Fallback si l'extraction automatique échoue
    if (resources.length === 0) {
        console.warn('Extraction automatique échouée, utilisation des valeurs par défaut');
        resources = [
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
    }

    // Styles CSS modernes inspirés d'iOS
    const styles = `
        #s3-resources-menu {
            position: fixed;
            top: 20px;
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

})();

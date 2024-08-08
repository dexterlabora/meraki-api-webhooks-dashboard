/**
 * API Key Management Module
 * 
 * This module handles the functionality for managing API keys in the Meraki Dashboard application.
 * It provides functions for fetching, displaying, generating, and revoking API keys.
 * 
 * Key features:
 * - Fetches and displays current API keys
 * - Allows generation of new API keys (up to a maximum of 2)
 * - Provides functionality to revoke existing API keys
 * - Updates the UI dynamically based on the number of existing keys
 * - Fetches and displays admin information (name, email, last used dashboard)
 * 
 * Main functions:
 * - fetchApiKeys(api): Retrieves and displays the current API keys
 * - fetchAndDisplayAdminInfo(api): Retrieves and displays admin information
 * - updateGenerateButton(count): Enables/disables the generate button based on key count
 * - generateApiKey(api): Generates a new API key
 * - revokeKey(suffix, api): Revokes an existing API key
 * - showInfoPopup(): Displays information about API key limits
 * - initializeApiKeyManagement(): Initializes the API key management page
 * 
 * This module interacts with the API handler (imported from './apiHandlers.js')
 * to perform API-related operations. It also manipulates the DOM to update
 * the user interface based on the current state of API keys and admin information.
 * 
 * Note: Ensure that the API handler is properly configured and the DOM elements
 * referenced in this module exist in the corresponding HTML file.
 */

import API from './apiHandlers.js';  // Ensure path is correct

export async function fetchApiKeys(api) {
    try {
        const { data: apiKeys } = await api.getAdministeredIdentitiesMeApiKeys();
        console.log("API Keys response:", apiKeys);

        const keysList = document.getElementById('apiKeysList');
        if (!keysList) {
            console.warn('API Keys list element not found. The API key management page might not be loaded yet.');
            return;
        }

        keysList.innerHTML = ''; // Clear existing keys

        if (apiKeys.length > 0) {
            apiKeys.forEach(key => {
                const row = `<tr>
                    <td>*****************${key.suffix}</td>
                    <td>${new Date(key.createdAt).toLocaleString()}</td>
                    <td><button onclick="revokeKey('${key.suffix}')" class="revoke-button">Revoke key</button></td>
                </tr>`;
                keysList.innerHTML += row;
            });
        } else {
            keysList.innerHTML = '<tr><td colspan="3">No API keys found.</td></tr>';
        }

        updateGenerateButton(apiKeys.length);
    } catch (error) {
        console.error('Error fetching API Keys:', error);
        const keysList = document.getElementById('apiKeysList');
        if (keysList) {
            keysList.innerHTML = '<tr><td colspan="3">Error fetching API keys. Please try again.</td></tr>';
        }
        updateGenerateButton(0);
    }
}

export async function fetchAndDisplayAdminInfo(api) {
    try {
        const { data: adminInfo } = await api.getAdministeredIdentitiesMe();
        console.log("Admin Info response:", adminInfo);

        const userNameElement = document.getElementById('userName');
        const userEmailElement = document.getElementById('userEmail');
        const adminInfoElement = document.getElementById('adminInfo');

        if (userNameElement) userNameElement.textContent = adminInfo.name;
        if (userEmailElement) userEmailElement.textContent = adminInfo.email;

        if (adminInfoElement) {
            adminInfoElement.innerHTML = `
                <p><strong>Last Used Dashboard:</strong> ${new Date(adminInfo.lastUsedDashboardAt).toLocaleString()}</p>
            `;
        }
    } catch (error) {
        console.error('Error fetching Admin Info:', error);
        const adminInfoElement = document.getElementById('adminInfo');
        if (adminInfoElement) {
            adminInfoElement.innerHTML = '<p>Error fetching admin information. Please try again.</p>';
        }
    }
}

function updateGenerateButton(count) {
    const generateButton = document.getElementById('generateApiKeyBtn');
    if (generateButton) {
        generateButton.disabled = count >= 2;
    }
}

export async function generateApiKey() {
    try {
        const api = new API(localStorage.getItem('MerakiApiKey'));
        await api.generateAdministeredIdentitiesMeApiKeys();
        await fetchApiKeys(api); // Refresh list
    } catch (error) {
        console.error('Error generating API Key:', error);
    }
}

export async function revokeKey(suffix) {
    try {
        const api = new API(localStorage.getItem('MerakiApiKey'));
        await api.getAdministeredIdentitiesMeApiKeysRevoke(suffix);
        await fetchApiKeys(api); // Refresh list
    } catch (error) {
        console.error('Error revoking API Key:', error);
    }
}

function showInfoPopup() {
    alert('You can have a maximum of two API keys. Revoke an old key to generate a new one.');
}

// New function to initialize the API key management page
export async function initializeApiKeyManagement(api) {
   // const api = new API(localStorage.getItem('MerakiApiKey'));
    await fetchApiKeys(api);
    await fetchAndDisplayAdminInfo(api);
}

// Export functions
export { showInfoPopup };

// Make functions available globally for onclick events
window.generateApiKey = generateApiKey;
window.revokeKey = revokeKey;
window.showInfoPopup = showInfoPopup;
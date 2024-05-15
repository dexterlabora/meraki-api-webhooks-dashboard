// apiKeyMgmt.js

import API from './apiHandlers.js';  // Ensure path is correct

// document.addEventListener('DOMContentLoaded', async function() {
//     const api = new API(localStorage.getItem('MerakiApiKey')); // Assuming apiKey is stored in localStorage
 
//     try {
//         const userDetails = await api.getAdministeredIdentitiesMe();
//         console.log("apiKeyMgmt userDetails", userDetails);
//         console.log("element userName", document.getElementById('userName'));
//         console.log("element userEmail", document.getElementById('userEmail'));
//         document.getElementById('userName').textContent = userDetails.name;
//         document.getElementById('userEmail').textContent = userDetails.email;
//     } catch (error) {
//         console.error('Error fetching user details:', error);
//     }
// });

export async function fetchApiKeys(api) {
    //console.log("fetchApiKeys api", api)
    try {
        const apiKeys = await api.getAdministeredIdentitiesMeApiKeys();
        console.log("apiKeyMgmt keys", apiKeys );
        const keysList = document.getElementById('apiKeysList');
        keysList.innerHTML = ''; // Clear existing keys

        apiKeys.forEach(key => {
            const row = `<tr>
                <td>*****************${key.suffix}</td>
                <td>${key.createdAt}</td>
                <td><button onclick="revokeKey('${key.suffix}, api)" class="revoke-button">Revoke key</button></td>
            </tr>`;
            keysList.innerHTML += row;
        });

        updateGenerateButton(apiKeys.length);
    } catch (error) {
        console.error('Error fetching API Keys:', error);
    }
}

function updateGenerateButton(count) {
    const generateButton = document.getElementById('generateApiKeyBtn');
    generateButton.disabled = count >= 2;
}

async function generateApiKey(api) {
    try {
        await api.generateAdministeredIdentitiesMeApiKeys();
        await fetchApiKeys(api); // Refresh list
    } catch (error) {
        console.error('Error generating API Key:', error);
    }
}

async function revokeKey(suffix, api) {
    try {
        await api.getAdministeredIdentitiesMeApiKeys(suffix);  // Check if this should be a DELETE request
        await fetchApiKeys(api); // Refresh list
    } catch (error) {
        console.error('Error revoking API Key:', error);
    }
}

function showInfoPopup() {
    alert('You can have a maximum of two API keys. Revoke an old key to generate a new one.');
}


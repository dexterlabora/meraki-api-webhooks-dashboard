/**
 * Meraki API Proxy Server
 * 
 * This Express.js server acts as a proxy for Meraki API requests. It provides:
 * 
 * - Static file serving for the frontend application
 * - A proxy endpoint for Meraki API requests
 * - Support for both live API calls and a mock mode for testing
 * - Error handling and request retries for API calls
 * - Dynamic routing to handle various API endpoints
 * 
 * The server can be run in two modes:
 * 1. Live mode: Proxies requests to the actual Meraki API
 * 2. Mock mode: Serves mock data from local JSON files
 * 
 * Environment variables:
 * - PORT: The port on which the server will run (default: 3000)
 * - MOCK_MODE: Set to 'true' to enable mock mode
 * 
 * Key functions:
 * - getStaticPath(): Determines the correct path for serving static files
 * - proxyMerakiApiRequest(): Handles proxying requests to the Meraki API
 */

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path')

require('dotenv').config();
app.use(express.json());


function getStaticPath() {
    if (process.pkg) {
        // '__dirname' gives the path to the snapshot filesystem in the executable
        return path.join(path.dirname(process.execPath), '../public');
    } else {
        return path.join(__dirname, 'public');
    }
}

app.use(express.static(getStaticPath()));

  
const mockMode = process.env.MOCK_MODE === 'true';

// Generic proxy function for Meraki API requests
async function proxyMerakiApiRequest(req, res, apiPath, method) {
    const apiKey = req.headers.authorization;
    
    if (!apiKey) {
        return res.status(401).send({ error: 'No API key provided' });
    }

    let url = new URL(`https://api.meraki.com/api/v1${apiPath}`);

    // Only add query parameters if they're not already in the URL
    Object.entries(req.query).forEach(([key, value]) => {
        if (!url.searchParams.has(key)) {
            if (Array.isArray(value)) {
                value.forEach(item => {
                    if (item !== undefined && item !== null && item !== '') {
                        url.searchParams.append(`${key}[]`, item);
                    }
                });
            } else if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, value);
            }
        }
    });

    console.log("Proxying request to:", url.toString());
    console.log("Query parameters:", req.query);

    try {
        const fetchOptions = {
            method: method,
            headers: {
                'Authorization': apiKey,
                'User-Agent': 'MerakiAPIMonitorMock CoryCreations',
                'Content-Type': req.headers['content-type'] || 'application/json'
            }
        };

        if (method === 'POST' || method === 'PUT') {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(url.toString(), fetchOptions);

        // Log headers for both successful and error responses
        console.log("Response headers:", Object.fromEntries(response.headers));

        if (!response.ok) {
            const errorText = await response.text();
            throw { status: response.status, message: errorText, headers: Object.fromEntries(response.headers) };
        }

        const data = await response.json();
        
        // Forward all headers from the Meraki API response
        for (const [key, value] of response.headers) {
            res.setHeader(key, value);
        }

        res.send(data);
        console.log(url.toString(), response.status);
    } catch (error) {
        console.error(`URL: ${url.toString()}, Request failed:`, error);
        if (error.headers) {
            console.log("Error response headers:", error.headers);
        }
        res.status(error.status || 500).send({ 
            error: error.message || 'Error fetching data from Meraki API',
            status: error.status || 500
        });
    }
}
// Dynamic routing to handle various API requests
app.all('/api/*', (req, res) => {
    if (mockMode) {
        const mockFile = req.url.replace('/api/', '') + '.json';
        res.sendFile(`${__dirname}/mockData/${mockFile}`);
    } else {
        const apiPath = req.url.replace('/api', '');
        const method = req.method;
        
        // Proxy the request to Meraki API with the appropriate method
        proxyMerakiApiRequest(req, res, apiPath, method);
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    if (process.send) {
        process.send('ready');
      }
});
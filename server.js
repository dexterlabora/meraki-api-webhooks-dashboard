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

    const url = `https://api.meraki.com/api/v1${apiPath}`;

    try {
        console.log("proxy", url)
        console.log("apiKey", apiKey)
        
        const fetchOptions = {
            method: method,
            headers: {
                'Authorization': apiKey,
                'User-Agent': 'MerakiAPIMonitorMock CoryCreations',
                'Content-Type': req.headers['content-type'] || 'application/json' // Include Content-Type header
            }
        };

        if (method === 'POST' || method === 'PUT') {
            fetchOptions.body = JSON.stringify(req.body); // Include request body for POST and PUT requests
        }

        console.log("FETCH ",url, fetchOptions)
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("response", url, response.status)
        res.send(data);
    } catch (error) {
        console.error('Error making API request to Meraki:', error);
        res.status(500).send({ error: 'Error fetching data from Meraki API' });
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

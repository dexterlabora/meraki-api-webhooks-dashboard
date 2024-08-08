/**
 * Meraki OpenAPI Specification Parser
 * 
 * This module fetches and parses the Meraki OpenAPI specification from GitHub.
 * It extracts key information about API operations, including their IDs, descriptions,
 * deprecation status, and tags.
 * 
 * Key features:
 * - Fetches the latest Meraki OpenAPI specification from GitHub
 * - Parses the specification to extract operation details
 * - Provides a structured array of operation information
 * 
 * Main function:
 * - fetchAndParseOpenAPISpec: Asynchronous function that fetches and processes the spec
 * 
 * The parsed data includes:
 * - operationId: Unique identifier for each API operation
 * - description: Brief description of the operation's purpose
 * - deprecated: Boolean indicating if the operation is deprecated
 * - tags: Array of tags associated with the operation
 * 
 * Note: This module requires the Axios library for making HTTP requests.
 * Ensure Axios is properly imported or included in your project.
 */

// const axios = require('axios');
console.log("running meraki-openapi-parser")
async function fetchAndParseOpenAPISpec() {
  const specUrl = 'https://raw.githubusercontent.com/meraki/openapi/v1-beta/openapi/spec3.json';
  
  try {
    const response = await axios.get(specUrl);
    const spec = response.data;
    
    const operationsInfo = [];
    
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (operation.operationId) {
          operationsInfo.push({
            operationId: operation.operationId,
            description: operation.description || '',
            deprecated: operation.deprecated || false,
            tags: operation.tags || []
          });
        }
      }
    }
    
    return operationsInfo;
  } catch (error) {
    console.error('Error fetching or parsing OpenAPI spec:', error);
    return [];
  }
}

export { fetchAndParseOpenAPISpec };
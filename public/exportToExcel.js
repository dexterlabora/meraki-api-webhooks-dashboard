/**
 * Excel Export Module
 * 
 * This module provides functionality to export data to Excel format (.xlsx) files.
 * It uses the SheetJS (XLSX) library to create and download Excel files directly
 * from the browser.
 * 
 * Key features:
 * - Converts nested JSON objects into tabular format, maintaining hierarchy through indentation or prefixes
 * - Supports exporting multiple sheets in a single workbook
 * - Automatically adjusts column widths to fit content
 * - Handles array and non-array data structures
 * 
 * Main functions:
 * - flattenObject: Utility function to flatten nested JSON objects and convert arrays to comma-separated strings
 * - exportToExcel: Core function to create and trigger download of Excel file
 * 
 * Usage:
 * Call exportToExcel(title, data) where:
 * - title: String to be used as the filename (without .xlsx extension)
 * - data: Object where each key represents a sheet name and its value is the data for that sheet
 * 
 * Note: This module is designed to work in modern browsers and requires internet
 * connection to load the XLSX library from CDN.
 */

let XLSX;

// Function to dynamically load the XLSX library
async function loadXLSX() {
    if (typeof window !== 'undefined' && window.XLSX) {
        // Browser environment with XLSX already loaded
        return window.XLSX;
    } else if (typeof window !== 'undefined') {
        // Browser environment, need to load XLSX
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            script.onload = () => resolve(window.XLSX);
            script.onerror = () => reject(new Error('Failed to load XLSX library'));
            document.head.appendChild(script);
        });
    } else {
        // Node.js environment (Electron)
        return require('xlsx');
    }
}

// Function to flatten nested objects and convert arrays to comma-separated strings
function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            if (Array.isArray(obj[k])) {
                // Convert array to comma-separated string
                acc[pre + k] = obj[k].map(item => {
                    if (typeof item === 'object' && item !== null) {
                        return JSON.stringify(item);
                    }
                    return item;
                }).join(', ');
            } else {
                Object.assign(acc, flattenObject(obj[k], pre + k));
            }
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

// Function to export data to Excel
async function exportToExcel(title, data) {
    try {
        if (!XLSX) {
            XLSX = await loadXLSX();
        }

        const wb = XLSX.utils.book_new();

        for (const sheetName in data) {
            if (data.hasOwnProperty(sheetName)) {
                let sheetData = data[sheetName];

                // Ensure sheetData is an array
                if (!Array.isArray(sheetData)) {
                    sheetData = [sheetData];
                }

                // Flatten each object in the array
                const flattenedData = sheetData.map(item => flattenObject(item));

                // Create worksheet
                const ws = XLSX.utils.json_to_sheet(flattenedData);

                // Add the worksheet to the workbook
                XLSX.utils.book_append_sheet(wb, ws, sheetName);

                // Auto-size columns
                const range = XLSX.utils.decode_range(ws['!ref']);
                const colWidths = [];
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    let maxWidth = 10; // Minimum width
                    for (let R = range.s.r; R <= range.e.r; ++R) {
                        const cell = ws[XLSX.utils.encode_cell({c: C, r: R})];
                        if (cell && cell.v) {
                            const width = (cell.v.toString().length + 2) * 1.2;
                            if (width > maxWidth) maxWidth = width;
                        }
                    }
                    colWidths[C] = {wch: Math.min(maxWidth, 100)}; // Cap width at 100
                }
                ws['!cols'] = colWidths;
            }
        }

        // Write to file
        if (typeof window !== 'undefined') {
            // Browser environment
            XLSX.writeFile(wb, `${title}.xlsx`);
        } else {
            // Node.js environment (Electron)
            const fs = require('fs');
            const path = require('path');
            const { app } = require('electron');
            const downloadsPath = app.getPath('downloads');
            const filePath = path.join(downloadsPath, `${title}.xlsx`);
            XLSX.writeFile(wb, filePath);
        }
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        throw error;
    }
}

// Export the function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportToExcel;
} else {
    window.exportToExcel = exportToExcel;
}

export { exportToExcel };
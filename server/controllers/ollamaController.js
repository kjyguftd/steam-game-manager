// server/controllers/ollamaController.js
// Ollama AI Integration Controller

const http = require('http');
const { getLibraryData } = require('./libraryController.js');

const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;
const OLLAMA_MODEL = 'gemma3:4b'; // Change this to your preferred model

/**
 * Helper function to send request to Ollama
 * @param {string} prompt - The prompt to send to Ollama
 * @returns {Promise<string>} - The AI response
 */
const callOllama = (prompt) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false
        });

        const options = {
            hostname: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`[Ollama] Sending request to ${OLLAMA_HOST}:${OLLAMA_PORT} with model ${OLLAMA_MODEL}`);
        
        const req = http.request(options, (res) => {
            let data = '';
            console.log(`[Ollama] Response status: ${res.statusCode}`);
            
            // Check status code first
            if (res.statusCode !== 200) {
                res.resume(); // Consume response data to free up memory
                const errorMsg = res.statusCode === 404 
                    ? `Model '${OLLAMA_MODEL}' not found. Run 'ollama pull ${OLLAMA_MODEL}'`
                    : `Ollama API status: ${res.statusCode}`;
                console.error(`[Ollama] Error: ${errorMsg}`);
                return reject(new Error(errorMsg));
            }

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`[Ollama] Response received, length: ${data.length}`);
                try {
                    const json = JSON.parse(data);
                    if (!json.response) {
                        console.warn('[Ollama] Warning: No "response" field in JSON', json);
                    }
                    resolve(json.response || '');
                } catch (e) {
                    console.error('[Ollama] JSON Parse Error:', e.message);
                    reject(new Error('Invalid JSON from Ollama'));
                }
            });
        });

        req.on('error', (e) => {
            console.error(`[Ollama] Connection failed: ${e.message}`);
            reject(new Error(`Ollama connection failed: ${e.message}`));
        });

        req.write(postData);
        req.end();
    });
};

/**
 * Generate Player Profile based on game library
 * POST /api/ollama/profile
 */
const generatePlayerProfile = async (req, res) => {
    const userId = req.userId;
    console.log(`[Ollama] Generating profile for User ID: ${userId}`);

    try {
        const games = await getLibraryData(userId);
        console.log(`[Ollama] Found ${games.length} games for analysis.`);
        
        // Sort by playtime (descending) and take top 15
        const topGames = games
            .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes)
            .slice(0, 15)
            .map(g => `${g.name} (${Math.round(g.playtimeMinutes / 60)} hours)`)
            .join(', ');

        if (!topGames) {
            console.log('[Ollama] No top games found.');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ response: "No games found to analyze." }));
        }

        const prompt = `
Given the player's most-played games and total hours, roast-analyze his/her gaming style, favorite genres, and personality traits. Make it sharp, witty, and under 150 words

Games: ${topGames}
        `.trim();

        const response = await callOllama(prompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response: response.trim() }));

    } catch (error) {
        console.error('[Ollama] Profile Generation Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Failed to generate profile. Ensure Ollama is running.' }));
    }
};

/**
 * Generate Life Balance Recommendation
 * POST /api/ollama/balance
 */
const generateLifeBalance = async (req, res) => {
    const userId = req.userId;
    console.log(`[Ollama] Generating life balance for User ID: ${userId}`);

    try {
        const games = await getLibraryData(userId);
        
        const totalMinutes = games.reduce((sum, game) => sum + game.playtimeMinutes, 0);
        const totalHours = Math.round(totalMinutes / 60);

        const prompt = `
The user has played a total of ${totalHours} hours of video games. 
Provide a short, friendly, and healthy life balance recommendation. 
If the playtime is very high, suggest taking breaks or trying other hobbies. 
If it's low, encourage them to have fun.
Keep it under 50 words.
        `.trim();

        const response = await callOllama(prompt);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response: response.trim() }));

    } catch (error) {
        console.error('[Ollama] Balance Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Failed to generate recommendation.' }));
    }
};

module.exports = {
    generatePlayerProfile,
    generateLifeBalance
};


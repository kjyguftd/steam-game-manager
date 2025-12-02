const express = require('express');
const router = express.Router();
const { encrypt, decrypt } = require('../utils/crypto');
const { saveEncryptedApiKey, getEncryptedApiKey } = require('../utils/userStore');
const { getOwnedGames } = require('../utils/steamApi');

// 保存 API Key（服务端加密后写入 data/users.json）
router.post('/user/:id/apikey', express.json(), async (req, res) => {
    try {
        const userId = req.params.id;
        const { apiKey } = req.body;
        if (!apiKey) return res.status(400).json({ error: 'missing_apiKey' });
        const enc = encrypt(apiKey);
        await saveEncryptedApiKey(userId, enc);
        return res.json({ ok: true });
    } catch (e) {
        console.error('Save API key error:', e);
        return res.status(500).json({ error: 'server_error' });
    }
});

// 触发同步：服务端读取并解密 API Key，再调用 Steam API
// body: { steamId64: '...' }
router.post('/user/:id/sync', express.json(), async (req, res) => {
    try {
        const userId = req.params.id;
        const { steamId64 } = req.body;
        if (!steamId64) return res.status(400).json({ error: 'missing_steamId64' });

        const enc = await getEncryptedApiKey(userId);
        if (!enc) return res.status(400).json({ error: 'no_api_key' });

        let apiKey;
        try {
            apiKey = decrypt(enc);
        } catch (e) {
            console.error('Decrypt API key failed:', e);
            return res.status(500).json({ error: 'decrypt_failed' });
        }

        const games = await getOwnedGames(steamId64, apiKey);
        return res.json({ games });
    } catch (e) {
        console.error('Sync error:', e);
        return res.status(500).json({ error: 'sync_failed' });
    }
});

module.exports = router;
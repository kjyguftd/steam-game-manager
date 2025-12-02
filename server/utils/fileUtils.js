// fileUtils.js

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

/**
 * 从 JSON 文件中读取数据
 * @param {string} filename 文件名 (如 'users.json')
 * @returns {Promise<Array<Object>>} 文件内容的 Promise
 */
const readJsonFile = (filename) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(DATA_DIR, filename);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                // 如果文件不存在或为空，返回空数组
                if (err.code === 'ENOENT' || data.trim() === '') {
                    return resolve([]);
                }
                return reject(err);
            }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                console.error(`Error parsing JSON file ${filename}:`, e);
                reject(new Error('Invalid JSON format in file'));
            }
        });
    });
};

/**
 * 将数据写入 JSON 文件
 * @param {string} filename 文件名
 * @param {Array<Object>} data 要写入的数据
 * @returns {Promise<void>}
 */
const writeJsonFile = (filename, data) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(DATA_DIR, filename);
        const jsonString = JSON.stringify(data, null, 2);
        fs.writeFile(filePath, jsonString, 'utf8', (err) => {
            if (err) {
                console.error(`Error writing to JSON file ${filename}:`, err);
                return reject(err);
            }
            resolve();
        });
    });
};

module.exports = {
    readJsonFile,
    writeJsonFile
};
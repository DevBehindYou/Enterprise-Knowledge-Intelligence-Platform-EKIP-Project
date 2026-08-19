/**
 * @typedef {Object} Citation
 * @property {string} documentId
 * @property {string} documentName
 * @property {number} [page]
 * @property {string} [section]
 * @property {string} chunkId
 *
 * @typedef {Object} ChatMessage
 * @property {string} _id
 * @property {'user'|'assistant'} role
 * @property {string} text
 * @property {Citation[]} [citations]
 * @property {number} [confidence]
 * @property {'up'|'down'|null} [feedback]
 */
export {};

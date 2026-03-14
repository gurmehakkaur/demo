const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URL || "mongodb://localhost:27017");
const db = client.db("borderpass");

module.exports = { client, db };

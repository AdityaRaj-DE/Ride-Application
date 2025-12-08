require('dotenv').config();
const mongoose = require('mongoose');


function connectToDb() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    mongoose.connect(mongoUri
    ).then(() => {
        console.log('Connected to DB');
    }).catch(err => console.log(err));
}


module.exports = connectToDb;
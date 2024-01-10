const mongoose = require('mongoose')
const Schema = mongoose.Schema

const promptSchema = new Schema({
    prompt: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    }

}, { timestamps: true })


module.exports = mongoose.model('Prompt', promptSchema)



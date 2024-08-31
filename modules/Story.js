const { default: mongoose } = require("mongoose");

const storyModel = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    story:{
        type:String
    },
    createdate:{
        type:Date,
        default:Date.now
    }
})

module.exports = mongoose.model('story', storyModel);
const { default: mongoose } = require("mongoose");

const postSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    picture:String,
    caption:{
        type:String
    },
    likes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    }],
    comments: {
        type: Array,
        default: []
    },
    shares:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    }],
    date:{
        type: Date,
        default: Date.now
    },
})

module.exports = mongoose.model("post", postSchema)
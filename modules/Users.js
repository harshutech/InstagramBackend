const { default: mongoose } = require("mongoose");
const plm = require('passport-local-mongoose')

const UserSchema = new mongoose.Schema({
    username:{
        type:String,
        unique:true
    },
    name:String,
    email:String,
    password:String,
    bio:String,
    contact:Number,
    picture:{
        type:String,
        default:"def.png"
    },
    saved:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post" 
    }],
    stories:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "story" 
    }],
    post:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post" 
    }],
    followers:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default:0 
    }],
    following:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default:0
    }],
    createdate:{
        type:Date,
        default:Date.now
    }
})

UserSchema.plugin(plm);
module.exports = mongoose.model("user", UserSchema)
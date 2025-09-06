import mongoose , {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            lowercase: true,
            index: true             //Searching field enable - optimize
        },
        
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },

        fullname: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        avatar: {
            type: String,           // Cloudinary URL
            required: true,
        },

        coverImage:{
            type: String,           // Cloudinary URL   
        },

        watchHistory:[
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],

        password : {
            type: String,
            required: [true , "Password is required"],
        },

        refreshToken: {
            type: String
        }
    },

    {
        timestamps: true
    }
)


// Mongoose Middleware hook - automatically runs before the user gets saved
userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password , 10)
    next()
})

// Mongoose instance method - compare password
userSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password , this.password)
}

// Mongoose instance method - generate JWT
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
    {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    }, 
    process.env.ACCESS_TOKEN_SECRET, 
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN
    })
}

// Mongoose instance method - generate Refresh Token
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
    {
        _id: this._id,
    }, 
    process.env.REFRESH_TOKEN_SECRET, 
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
    })
}

export const User = mongoose.model("User", userSchema);
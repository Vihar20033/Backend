import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String,           // Cloudinary URL for the video file
            required: true
        },

        thumbnail:{
            type: String,           // Cloudinary URL for the thumbnail image
            required: true
        },

        title:{
            type: String,
            required: true
        },

        description:{
            type: String,
            required: true
        },

        duration: {
            type: Number,           // Duration of the video in seconds from cloudinary
            required: true
        },

        views:{
            type: Number,
            default: 0
        },

        isPublished: {
            type: Boolean,
            default: true
        },

        owner:{
            type: Schema.Types.ObjectId,
            ref: "User",
        }

    },
    {
        timestamps: true
    }

)

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
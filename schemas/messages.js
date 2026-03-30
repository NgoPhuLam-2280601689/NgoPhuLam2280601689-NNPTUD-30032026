const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: [true, "Người gửi là bắt buộc"]
        },

        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: [true, "Người nhận là bắt buộc"]
        },

        messageContent: {
            type: {
                type: String,
                enum: ["text", "file"],
                required: [true, "Loại nội dung là bắt buộc"]
            },
            text: {
                type: String,
                required: [true, "Nội dung là bắt buộc"]
            }
        },

        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

messageSchema.index({
    from: 1,
    to: 1
});

messageSchema.index({
    to: 1,
    from: 1
});

module.exports = mongoose.model("message", messageSchema);

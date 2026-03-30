var express = require("express");
var router = express.Router();
let messageModel = require("../schemas/messages");
let { checkLogin } = require("../utils/authHandler.js");
const { default: mongoose } = require("mongoose");

/**
 * GET /messages/:userID
 * Lấy toàn bộ message giữa user hiện tại và userID
 * (messages from: user hiện tại to: userID 
 *  AND from: userID to: user hiện tại)
 */
router.get("/:userID", checkLogin, async function (req, res, next) {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.userId);
    const otherUserId = req.params.userID;

    // Kiểm tra xem userID có hợp lệ không
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).send({ message: "ID người dùng không hợp lệ" });
    }

    const otherUserIdObj = new mongoose.Types.ObjectId(otherUserId);

    // Lấy tất cả message giữa 2 người
    const messages = await messageModel
      .find({
        isDeleted: false,
        $or: [
          { from: currentUserId, to: otherUserIdObj },
          { from: otherUserIdObj, to: currentUserId }
        ]
      })
      .populate({
        path: "from",
        select: "username fullName avatarUrl"
      })
      .populate({
        path: "to",
        select: "username fullName avatarUrl"
      })
      .sort({ createdAt: 1 });

    res.send({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).send({
      message: "Lỗi khi lấy tin nhắn",
      error: error.message
    });
  }
});

/**
 * POST /messages
 * Gửi tin nhắn
 * Body: {
 *   to: userID,
 *   messageContent: {
 *     type: "text" hoặc "file",
 *     text: nội dung hoặc đường dẫn file
 *   }
 * }
 */
router.post("/", checkLogin, async function (req, res, next) {
  let session = await mongoose.startSession();
  let transaction = session.startTransaction();
  try {
    const { to, messageContent } = req.body;
    const currentUserId = req.userId;

    // Kiểm tra dữ liệu đầu vào
    if (!to || !messageContent) {
      await transaction.abortTransaction();
      session.endSession();
      return res.status(400).send({
        message: "Thiếu dữ liệu: to và messageContent là bắt buộc"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(to)) {
      await transaction.abortTransaction();
      session.endSession();
      return res.status(400).send({ message: "ID người nhận không hợp lệ" });
    }

    if (!messageContent.type || !messageContent.text) {
      await transaction.abortTransaction();
      session.endSession();
      return res.status(400).send({
        message: "messageContent phải có type và text"
      });
    }

    if (!["text", "file"].includes(messageContent.type)) {
      await transaction.abortTransaction();
      session.endSession();
      return res.status(400).send({
        message: "type chỉ có thể là 'text' hoặc 'file'"
      });
    }

    // Không cho phép gửi tin nhắn cho chính mình
    if (currentUserId === to) {
      await transaction.abortTransaction();
      session.endSession();
      return res.status(400).send({
        message: "Không thể gửi tin nhắn cho chính bạn"
      });
    }

    // Tạo tin nhắn mới
    const newMessage = new messageModel({
      from: currentUserId,
      to: to,
      messageContent: {
        type: messageContent.type,
        text: messageContent.text
      }
    });

    await newMessage.save({ session });
    await transaction.commitTransaction();
    session.endSession();

    // Populate dữ liệu trước khi gửi response
    await newMessage.populate({
      path: "from",
      select: "username fullName avatarUrl"
    });
    await newMessage.populate({
      path: "to",
      select: "username fullName avatarUrl"
    });

    res.status(201).send({
      success: true,
      message: "Gửi tin nhắn thành công",
      data: newMessage
    });
  } catch (error) {
    await transaction.abortTransaction();
    session.endSession();
    res.status(500).send({
      message: "Lỗi khi gửi tin nhắn",
      error: error.message
    });
  }
});

/**
 * GET /messages
 * Lấy message cuối cùng của mỗi user mà user hiện tại nhắn tin hoặc user khác nhắn cho user hiện tại
 * Trả về danh sách các cuộc hội thoại
 */
router.get("/", checkLogin, async function (req, res, next) {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.userId);

    // Tìm tất cả các user mà user hiện tại có message với
    const conversations = await messageModel.aggregate([
      {
        $match: {
          isDeleted: false,
          $or: [
            { from: currentUserId },
            { to: currentUserId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$from", currentUserId] },
              "$to",
              "$from"
            ]
          },
          lastMessage: { $first: "$messageContent.text" },
          lastMessageType: { $first: "$messageContent.type" },
          lastMessageTime: { $first: "$createdAt" },
          messageId: { $first: "$_id" }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          lastMessageType: 1,
          lastMessageTime: 1,
          messageId: 1,
          username: "$userInfo.username",
          fullName: "$userInfo.fullName",
          avatarUrl: "$userInfo.avatarUrl"
        }
      }
    ]);

    res.send({
      success: true,
      data: conversations
    });
  } catch (error) {
    res.status(500).send({
      message: "Lỗi khi lấy danh sách cuộc hội thoại",
      error: error.message
    });
  }
});

module.exports = router;

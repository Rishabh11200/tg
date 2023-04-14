import { NewMessageEvent } from "telegram/events/index.js";
import { checkStartCMD, checkSysMsg, removeStartCMD } from "./utlis.js";
import { chat, help, helpMsg, ytMiniHelp } from "./constants.js";
import { Api, TelegramClient } from "telegram";
import ytdl from "ytdl-core";
import { onAudio, onVideo } from "./yt.js";
import { openAIfunc } from "./openai.js";

/**
 * @type {NewMessageEvent[]}
 */
globalThis.ytReplied = [];
/**
 *
 * @param {NewMessageEvent} wholeMsg
 * @param {TelegramClient} client
 */
export const onMessage = async (wholeMsg, client) => {
  const msg = wholeMsg.message.message;
  const isReply = wholeMsg.message.isReply;
  const from = wholeMsg.message.peerId.userId;
  if (checkStartCMD(help, msg)) {
    await client.sendMessage(from, { message: helpMsg, parseMode: "md" });
  }

  if (checkStartCMD(chat, msg)) {
    let query = removeStartCMD(chat, msg.toString().toLowerCase());
    let finalQuery = checkSysMsg(query.toString());
    if (query.length > 0) {
      /**
       * @type {Api.Message}
       */
      let responseReply;
      let chatGptUserID = from,
        response;
      if (finalQuery.systemMsg) {
        if (!finalQuery.query) {
          await client.sendMessage(from, {
            message: "Please add query with system message to think...",
          });
        } else {
          responseReply = await client.sendMessage(from, {
            message: "Thinking...💭💭🤔",
          });
          response = await openAIfunc(
            finalQuery.query,
            chatGptUserID,
            finalQuery.systemMsg
          );
        }
      } else {
        responseReply = await client.sendMessage(from, {
          message: "Thinking...💭💭🤔",
        });
        response = await openAIfunc(finalQuery.query, chatGptUserID);
      }
      await client.editMessage(from, {
        message: responseReply.id,
        text: response,
        parseMode: "md",
      });
    } else {
      await client.sendMessage(from, {
        message: "Please add prompt to think...",
      });
    }
  }

  if (ytdl.validateURL(msg.toString())) {
    await client.sendMessage(from, { message: ytMiniHelp }).then((msg) => {
      globalThis.ytReplied.push(msg);
    });
  }

  if (
    isReply &&
    (msg.toString().toLowerCase().startsWith("audio") ||
      msg.toString().toLowerCase().startsWith("video"))
  ) {
    if (globalThis.ytReplied.length > 0) {
      globalThis.ytReplied.map(async (single) => {
        await client.deleteMessages(from, [single], {
          revoke: true,
        });
      });
    }
    const quotedLink = await wholeMsg.message.getReplyMessage();
    const msgLow = msg.toString().toLowerCase();
    if (ytdl.validateURL(quotedLink.message.toString())) {
      if (msgLow === "audio") {
        await onAudio(quotedLink.message.toString(), client, from);
      }
      if (msgLow === "video") {
        await onVideo(quotedLink.message.toString(), client, from);
      }
    }
  }
};

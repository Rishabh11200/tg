import {
  checkAndUnlink,
  checkStartCMD,
  checkSysMsg,
  download,
  generateRandomSixDigitNumber,
  processString,
  removeStartCMD,
} from "./utlis.js";
import {
  chat,
  help,
  helpMsg,
  image,
  playlist,
  ytMiniHelp,
} from "./constants.js";
import { Api, TelegramClient } from "telegram";
import ytdl from "ytdl-core";
import { onAudio, onPlaylist, onVideo } from "./yt.js";
import { imageFunction, openAIfunc } from "./openai.js";
import { NewMessageEvent } from "telegram/events/NewMessage.js";
import ytpl from "ytpl";

/** @type {Api.Message[]} */
globalThis.ytReplied = [];
/** @type {Api.Message[]} */
globalThis.playlistReplied = [];
/**
 *
 * @param {NewMessageEvent} wholeMsg
 * @param {TelegramClient} client
 */
export const onMessage = async (wholeMsg, client) => {
  await client.getDialogs({ limit: 50 });
  const msg = wholeMsg.message.message;
  const isReply = wholeMsg.message.isReply;
  const from = wholeMsg.message.peerId.userId;
  if (checkStartCMD(help, msg)) {
    await client.sendMessage(from, {
      message: helpMsg,
      parseMode: "md",
    });
    await client.invoke(
      new Api.messages.SendReaction({
        big: true,
        addToRecent: true,
        msgId: wholeMsg.message.id,
        peer: from,
        reaction: [new Api.ReactionEmoji({ emoticon: "🏆" })],
      })
    );
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
          await client.invoke(
            new Api.messages.SendReaction({
              big: true,
              addToRecent: true,
              msgId: wholeMsg.message.id,
              peer: from,
              reaction: [new Api.ReactionEmoji({ emoticon: "👎" })],
            })
          );
          await client.sendMessage(from, {
            message: "Please add query with system message to think...",
          });
        } else {
          await client.invoke(
            new Api.messages.SendReaction({
              big: true,
              addToRecent: true,
              msgId: wholeMsg.message.id,
              peer: from,
              reaction: [new Api.ReactionEmoji({ emoticon: "🤔" })],
            })
          );
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
        await client.invoke(
          new Api.messages.SendReaction({
            big: true,
            addToRecent: true,
            msgId: wholeMsg.message.id,
            peer: from,
            reaction: [new Api.ReactionEmoji({ emoticon: "🤔" })],
          })
        );
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
      await client.invoke(
        new Api.messages.SendReaction({
          big: true,
          addToRecent: true,
          msgId: wholeMsg.message.id,
          peer: from,
          reaction: [new Api.ReactionEmoji({ emoticon: "😇" })],
        })
      );
    } else {
      await client.invoke(
        new Api.messages.SendReaction({
          big: true,
          addToRecent: true,
          msgId: wholeMsg.message.id,
          peer: from,
          reaction: [new Api.ReactionEmoji({ emoticon: "👎" })],
        })
      );
      await client.sendMessage(from, {
        message: "Please add prompt to think...",
      });
    }
  }

  if (checkStartCMD(image, msg)) {
    const fileName = `./db/${from}${generateRandomSixDigitNumber()}.png`;
    let query = removeStartCMD(image, msg.toLowerCase());
    if (query.length > 0) {
      /**
       * @type {Api.Message}
       */
      let universalMsg = await client.sendMessage(from, {
        message: "Generating...⏳🔮🌇",
      });
      await client.invoke(
        new Api.messages.SendReaction({
          big: true,
          addToRecent: true,
          msgId: wholeMsg.message.id,
          peer: from,
          reaction: [new Api.ReactionEmoji({ emoticon: "👀" })],
        })
      );
      let imgUrl = await imageFunction(query);
      if (imgUrl.toString().startsWith("http")) {
        download(imgUrl, fileName, async () => {
          await client.editMessage(from, {
            message: universalMsg.id,
            text: "Uploading...⤴️",
          });
          await client
            .sendFile(from, {
              file: fileName,
              forceDocument: true,
            })
            .then(async () => {
              await client.deleteMessages(from, [universalMsg.id], {
                revoke: true,
              });
              await client.invoke(
                new Api.messages.SendReaction({
                  big: true,
                  addToRecent: true,
                  msgId: wholeMsg.message.id,
                  peer: from,
                  reaction: [new Api.ReactionEmoji({ emoticon: "😇" })],
                })
              );
            });
          checkAndUnlink(fileName);
        });
      } else {
        await client.sendMessage(from, {
          message: `Error generating image: ⚠️ ${imgUrl}`,
        });
        setTimeout(async () => {
          await client.invoke(
            new Api.messages.SendReaction({
              big: true,
              addToRecent: true,
              msgId: wholeMsg.message.id,
              peer: from,
              reaction: [new Api.ReactionEmoji({ emoticon: "👎" })],
            })
          );
        }, 500);
      }
    } else {
      await client.invoke(
        new Api.messages.SendReaction({
          big: true,
          addToRecent: true,
          msgId: wholeMsg.message.id,
          peer: from,
          reaction: [new Api.ReactionEmoji({ emoticon: "👎" })],
        })
      );
      await client.sendMessage(from, {
        message: "Please add prompt to generate image...",
      });
    }
  }

  if (ytdl.validateURL(msg.toString())) {
    await client.sendMessage(from, { message: ytMiniHelp }).then((msg) => {
      globalThis.ytReplied.push(msg);
    });
    await client.invoke(
      new Api.messages.SendReaction({
        big: true,
        addToRecent: true,
        msgId: wholeMsg.message.id,
        peer: from,
        reaction: [new Api.ReactionEmoji({ emoticon: "😇" })],
      })
    );
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

  if (ytpl.validateID(msg.toString())) {
    await client.invoke(
      new Api.messages.SendReaction({
        big: true,
        addToRecent: true,
        msgId: wholeMsg.message.id,
        peer: from,
        reaction: [new Api.ReactionEmoji({ emoticon: "😇" })],
      })
    );
    /**  @type {ytpl.Result} */
    const allPlaylist = await ytpl(msg.toString());
    await client
      .sendMessage(from, { message: playlist(allPlaylist.estimatedItemCount) })
      .then((msg) => {
        globalThis.playlistReplied.push(msg);
      });
  }

  if (
    isReply &&
    (msg.toString().toLowerCase().startsWith("audio") ||
      msg.toString().toLowerCase().startsWith("video"))
  ) {
    if (globalThis.playlistReplied.length > 0) {
      globalThis.playlistReplied.map(async (single) => {
        await client.deleteMessages(from, [single], {
          revoke: true,
        });
      });
    }
    const quotedLink = await wholeMsg.message.getReplyMessage();
    const msgLow = msg.toString().toLowerCase();
    if (ytpl.validateID(quotedLink.message.toString())) {
      let checkMsg = processString(msgLow);
      if (checkMsg[0] === "audio") {
        /** @type {number} */
        let itemsToDownload = 0;
        if (checkMsg.length > 0) {
          itemsToDownload = parseInt(checkMsg[1]);
        }
        await onPlaylist(
          quotedLink.message.toString(),
          client,
          from,
          itemsToDownload
        );
      }
    }
  }
};

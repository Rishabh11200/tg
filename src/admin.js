import fs from "fs";
import { Api, TelegramClient } from "telegram";
import { NewMessageEvent } from "telegram/events/index.js";
import { checkStartCMD } from "./utlis.js";
import { addUser, deleteUser, getAll } from "./constants.js";

/**
 *
 * @param {NewMessageEvent} wholeMsg
 * @param {TelegramClient} client
 */
export const onMyMsg = async (wholeMsg, client) => {
  let peerId = wholeMsg.message.peerId?.userId?.toString();
  let originalID = wholeMsg.message.peerId?.userId;
  const msg = wholeMsg.message.message;

  if (checkStartCMD(addUser, msg)) {
    const filePath = "./src/users.js";
    fs.readFile(filePath, "utf-8", async (err, data) => {
      if (err) throw err;

      const arrayStartIndex = data.indexOf("[");
      const arrayEndIndex = data.indexOf("]");
      const arrayData = data.slice(arrayStartIndex, arrayEndIndex + 1);

      const dataArray = eval(arrayData);

      const newMember = peerId.replace(/\D/g, "");
      dataArray.push(newMember);

      const updatedFileData =
        data.slice(0, arrayStartIndex) +
        JSON.stringify(dataArray) +
        data.slice(arrayEndIndex + 1);

      await client.deleteMessages(originalID, [wholeMsg.message.id], {
        revoke: true,
      });
      fs.writeFile(filePath, updatedFileData, "utf-8", async (err) => {
        if (err) throw err;
        await client.sendMessage(originalID, {
          message: "Added successfully✅",
        });
      });
    });
  }

  if (checkStartCMD(getAll, msg)) {
    const filePath = "./src/users.js";
    fs.readFile(filePath, "utf-8", async (err, data) => {
      if (err) throw err;

      const arrayStartIndex = data.indexOf("[");
      const arrayEndIndex = data.indexOf("]");
      const arrayData = data.slice(arrayStartIndex, arrayEndIndex + 1);

      const dataArray = eval(arrayData);

      let allUsersName = [];
      const promises = dataArray.map(async (single) => {
        const result = await client.invoke(
          new Api.users.GetFullUser({
            id: single,
          })
        );
        let userName = result.users[0].username ?? result.users[0].firstName;
        allUsersName.push(` ${result.users[0].username ? '@' : ''}${userName}`);
      });

      Promise.all(promises)
        .then(async (results) => {
          await client.sendMessage(originalID, {
            message: allUsersName,
          });
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    });
  }

  if (checkStartCMD(deleteUser, msg)) {
    const filePath = "./src/users.js";
    fs.readFile(filePath, "utf-8", async (err, data) => {
      if (err) throw err;

      const arrayStartIndex = data.indexOf("[");
      const arrayEndIndex = data.indexOf("]");
      const arrayData = data.slice(arrayStartIndex, arrayEndIndex + 1);

      const dataArray = eval(arrayData);

      const nameToDelete = peerId.replace(/\D/g, "");
      const indexToDelete = dataArray.indexOf(nameToDelete);
      if (indexToDelete !== -1) {
        dataArray.splice(indexToDelete, 1);
        await client.deleteMessages(originalID, [wholeMsg.message.id], {
          revoke: true,
        });
        await client.sendMessage(originalID, {
          message: "Deleted successfully✅",
        });
      } else {
        await client.deleteMessages(originalID, [wholeMsg.message.id], {
          revoke: true,
        });
        await client.sendMessage(originalID, {
          message: "Not there in db",
        });
      }

      const updatedFileData =
        data.slice(0, arrayStartIndex) +
        JSON.stringify(dataArray) +
        data.slice(arrayEndIndex + 1);

      fs.writeFile(filePath, updatedFileData, "utf-8", async (err) => {
        if (err) throw err;
      });
    });
  }
};

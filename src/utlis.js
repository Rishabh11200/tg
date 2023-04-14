import fs from "fs";
import request from "request";
import { TelegramClient } from "telegram";
import { NewMessageEvent } from "telegram/events/index.js";

export function removeStartCMD(wordArr, main) {
  let firstTemp;
  wordArr.some((word) => {
    let re = new RegExp(word, "gi");
    if (re.test(main)) {
      firstTemp = main.replace(re, "");
    }
  });
  let final = firstTemp
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
  return final.trim();
}

export function checkSysMsg(str) {
  const regex = /\(([^)]+)\)/;
  const regexN = /\([^)]+\)/g;
  const match = str.match(regex);
  let systemMsg, query;
  if (match) {
    systemMsg = match[1];
    let tempArr = str.split(regexN);
    let tempStr = tempArr.join("");
    let newStr = tempStr.replace(/\s{2,}/g, " ");
    query = newStr.trim();
  } else {
    query = str;
  }
  return {
    systemMsg,
    query,
  };
}

export function checkStartCMD(arr, string) {
  let str = string.toString().toLowerCase();
  return arr.some((word) => str.startsWith(word));
}

export var download = function (uri, filename, callback) {
  request.head(uri, async function (err, res, body) {
    request(uri).pipe(fs.createWriteStream(filename)).on("close", callback);
  });
};

export function checkAndUnlink(path) {
  if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
}

export function generateRandomSixDigitNumber() {
  return Math.floor(100000 + Math.random() * 900000);
}

/**
 *
 * @param {TelegramClient} client
 * @param {any} from
 * @param {string} filePath
 * @param {number} startTime
 * @param {number} endTime
 * @param {number} percentage
 * @param {number} lastLogTime
 * @param {NewMessageEvent} uploadMessage
 * @param {Set} endNumbers
 */
export async function sendFile(
  client,
  from,
  filePath,
  startTime = null,
  endTime = null,
  percentage = null,
  lastLogTime = 0,
  uploadMessage = null,
  endNumbers = new Set()
) {
  let isVideo = filePath.includes("mp4");
  await client.sendFile(from, {
    file: filePath,
    forceDocument: isVideo ? true : false,
    progressCallback: async (pro) => {
      percentage = parseFloat(pro * 100).toFixed(2);
      let intPer = parseInt(percentage);

      if (pro < 0.01 && !startTime) {
        uploadMessage = await client.sendMessage(from, {
          message: "Uploading",
        });
        startTime = Date.now();
      }

      if (startTime) {
        const elapsedTime = Date.now() - startTime;
        const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
        const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
        const seconds = Math.floor((elapsedTime / 1000) % 60);
        const formattedHours = hours.toString().padStart(2, "0");
        const formattedMinutes = minutes.toString().padStart(2, "0");
        const formattedSeconds = seconds.toString().padStart(2, "0");
        const formattedElapsedTime = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        if (elapsedTime >= 3000 && elapsedTime <= 3100) {
          if(!endNumbers.has(elapsedTime)) {
          await client.editMessage(from, {
            message: uploadMessage.id,
            text: `Elapsed time: ${formattedElapsedTime}. \nUploading...⤴️: ${intPer}%`,
          });
          endNumbers.add(elapsedTime);
        }
        }
        if (elapsedTime >= 5000 + lastLogTime) {
          await client.editMessage(from, {
            message: uploadMessage.id,
            text: `Elapsed time: ${formattedElapsedTime}. \nUploading...⤴️: ${intPer}%`,
          });
          lastLogTime += 5000;
        }
      }

      if (percentage >= 99.5 && startTime) {
        endNumbers.clear();
        if (!endNumbers.has(percentage)) {
          endTime = Date.now();
          const elapsedTime = endTime - startTime;
          const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
          const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
          const seconds = Math.floor((elapsedTime / 1000) % 60);
          const formattedHours = hours.toString().padStart(2, "0");
          const formattedMinutes = minutes.toString().padStart(2, "0");
          const formattedSeconds = seconds.toString().padStart(2, "0");
          const formattedElapsedTime = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
          await client.editMessage(from, {
            message: uploadMessage.id,
            text: `✅Uploaded in: ${formattedElapsedTime}.`,
          });
          endNumbers.add(percentage);
        }
      }
    },
  });
}
